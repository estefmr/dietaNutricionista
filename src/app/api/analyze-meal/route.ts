import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import {
  MODEL,
  MAX_TOKENS,
  MAX_IMAGE_BASE64_LENGTH,
  SYSTEM_RULES,
  MEAL_TOOL,
  buildDynamicContext,
  extractAnalysis,
} from "@/lib/meal-analysis";

// Claude tarda 3-8s analizando; damos margen.
export const maxDuration = 30;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function POST(req: Request) {
  // --- 1. Validación de entrada (sin gastar tokens si algo falta) ---
  let body: { patientId?: string; mealType?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const { patientId, mealType, image } = body;
  if (!patientId || !image) {
    return NextResponse.json(
      { error: "Faltan datos requeridos (paciente o imagen)." },
      { status: 400 }
    );
  }

  const match = image.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Formato de imagen inválido." }, { status: 400 });
  }
  const mediaType = match[1] as MediaType;
  const base64Data = match[2];

  if (base64Data.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "La imagen es demasiado grande. Toma una foto más liviana." },
      { status: 413 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY ausente en el servidor.");
    return NextResponse.json(
      { error: "El servicio de análisis no está configurado." },
      { status: 503 }
    );
  }

  // --- 2. Dieta del paciente (404 antes de llamar a la IA) ---
  let dietInstructions: string;
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("diet_instructions")
      .eq("id", patientId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
    }
    dietInstructions = data.diet_instructions;
  } catch (err) {
    console.error("DB error al obtener la dieta:", err);
    return NextResponse.json(
      { error: "No se pudo conectar con la base de datos." },
      { status: 503 }
    );
  }

  // --- 3. Análisis con Claude (errores de IA aislados) ---
  let analysis;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: SYSTEM_RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: buildDynamicContext(dietInstructions, mealType ?? "comida") },
      ],
      tools: [MEAL_TOOL],
      tool_choice: { type: "tool", name: MEAL_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: "Analiza este plato." },
          ],
        },
      ],
    });

    analysis = extractAnalysis(response.content);
    if (!analysis) {
      console.error("Claude no devolvió tool_use válido:", response.stop_reason);
      return NextResponse.json(
        { error: "No se pudo interpretar el análisis. Intenta de nuevo." },
        { status: 502 }
      );
    }
  } catch (err) {
    // No filtramos el mensaje crudo de la API al cliente.
    if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic APIError ${err.status}:`, err.message);
    } else {
      console.error("Error inesperado llamando a Claude:", err);
    }
    return NextResponse.json(
      { error: "El análisis no está disponible ahora mismo. Vuelve a intentarlo en unos minutos." },
      { status: 502 }
    );
  }

  // --- 4. Persistir el log (no bloqueante para la respuesta) ---
  const feedback = analysis.recomendaciones
    ? `${analysis.justificacion}\n\n${analysis.recomendaciones}`
    : analysis.justificacion;

  const { error: insertError } = await supabase.from("meal_logs").insert([
    {
      patient_id: patientId,
      meal_type: mealType,
      is_compliant: analysis.cumple_estandar,
      feedback,
    },
  ]);
  if (insertError) {
    // El análisis ya es válido; logueamos pero igual respondemos al paciente.
    console.error("No se pudo guardar el meal_log:", insertError.message);
  }

  return NextResponse.json({ result: analysis });
}
