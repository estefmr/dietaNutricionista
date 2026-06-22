import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

// Inicializar el SDK de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { patientId, mealType, image } = await req.json();

    if (!patientId || !image) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (ID del paciente o imagen)." },
        { status: 400 }
      );
    }

    // 1. Obtener las instrucciones de la dieta desde Supabase
    const { data: patientData, error: dbError } = await supabase
      .from("patients")
      .select("diet_instructions")
      .eq("id", patientId)
      .single();

    if (dbError || !patientData) {
      return NextResponse.json(
        { error: "No se encontró el paciente o hubo un error en la base de datos." },
        { status: 404 }
      );
    }

    const dietInstructions = patientData.diet_instructions;

    // 2. Extraer el tipo de imagen y los datos base64 reales
    // Ejemplo de image: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const match = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Formato de imagen inválido." },
        { status: 400 }
      );
    }
    
    const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];

    // 3. Llamar a Claude para analizar la imagen
    // Optimizaciones de tokens:
    //  - Prompt caching: el bloque estático (rol + reglas) se cachea y reutiliza
    //    entre llamadas (90% de descuento en input tokens cuando hay cache hit).
    //  - El bloque dinámico (dieta del paciente + tipo de comida) va sin cache.
    //  - tool_choice fuerza JSON estructurado para minimizar output tokens.
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: `Eres el nutricionista del paciente, no un evaluador externo. Tu trabajo es analizar la foto del plato que te enviaron y darle una devolución cálida, breve y útil, como lo haría un profesional cercano que quiere que su paciente progrese sin desmotivarse.

Tono y estilo (obligatorios):
- Hablas directamente al paciente en segunda persona ("tu plato", "te recomiendo", "trata de").
- Cálido, alentador y humano. Nada de frases técnicas frías ni listas numeradas.
- Conciso: usa frases cortas, naturales.

Cómo evaluar (criterio flexible):
- Marca cumple_estandar = TRUE cuando el plato sea esencialmente correcto: contiene los componentes principales de la dieta aunque haya variaciones menores (sustituciones razonables como pecanas por nueces, porciones ligeramente distintas, presentación distinta).
- Marca cumple_estandar = FALSE solo cuando el plato esté claramente fuera de la dieta: faltan los componentes principales, hay alimentos prohibidos en cantidad relevante, o es una comida totalmente distinta a la indicada.
- Asume lo razonable cuando algo es ambiguo: si ves un líquido blanco en un vaso, asume que es leche; si la dieta pide leche descremada, recomiéndalo en lugar de marcar incumplimiento; si ves un ingrediente que podría ser dos cosas similares, elige el más probable.
- No penalices por lo que no puedes ver con certeza. Si no puedes confirmar algo (tipo de cocción, si la leche es descremada, si el pan es integral), conviértelo en una recomendación amable, no en una falla.

Cómo redactar cada campo:
- justificacion: 1-2 frases que resuman cómo va el plato. Si cumple, celébralo con calidez ("¡Excelente, tu plato cumple con la dieta!"). Si no cumple, explícalo de forma constructiva, sin regañar.
- recomendaciones: OPCIONAL. Solo inclúyela cuando tengas algo que mejorar (porción, tipo de leche, sustituciones, etc.). Empieza con un encabezado natural tipo "Te dejo un par de recomendaciones:" y enumera con guiones cortos. Si todo está perfecto, omite este campo por completo.

Caso especial — imagen sin comida o muy borrosa:
- cumple_estandar = false
- justificacion = "No pude ver bien tu plato. ¿Puedes mandarme otra foto con mejor luz o un poco más cerca?"
- No envíes recomendaciones en este caso.`,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: `Instrucciones de dieta del paciente:
"${dietInstructions}"

El paciente está intentando consumir un(a): ${mealType}.`,
        },
      ],
      tools: [
        {
          name: "report_meal_analysis",
          description: "Reporta la evaluación amable del plato del paciente frente a su dieta asignada.",
          input_schema: {
            type: "object",
            properties: {
              cumple_estandar: {
                type: "boolean",
                description: "TRUE si el plato es esencialmente correcto (cumple con los componentes principales aunque haya variaciones menores). FALSE solo si está claramente fuera de la dieta o si no se ve comida."
              },
              justificacion: {
                type: "string",
                description: "1-2 frases cálidas y directas al paciente. Si cumple, felicítalo. Si no cumple, explícalo de forma constructiva sin regañar."
              },
              recomendaciones: {
                type: "string",
                description: "OPCIONAL. Tips amables para mejorar el plato (porción, tipo de ingrediente, sustituciones). Solo inclúyelo si hay algo concreto que sugerir. Formato: encabezado corto + bullets con guiones."
              }
            },
            required: ["cumple_estandar", "justificacion"]
          }
        }
      ],
      tool_choice: { type: "tool", name: "report_meal_analysis" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Analiza este plato."
            }
          ],
        },
      ],
    });

    // 4. Extraer el resultado de la herramienta
    type AnalysisResult = {
      cumple_estandar: boolean;
      justificacion: string;
      recomendaciones?: string;
    };
    let analysisResult: AnalysisResult | null = null;
    if (response.content) {
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'report_meal_analysis') {
          analysisResult = block.input as AnalysisResult;
          break;
        }
      }
    }

    if (!analysisResult) {
      throw new Error("No se pudo obtener un resultado estructurado de la IA.");
    }

    // Persistimos justificación + recomendaciones juntas para que el nutricionista
    // vea todo el feedback en el historial sin tocar el schema de la tabla.
    const feedback = analysisResult.recomendaciones
      ? `${analysisResult.justificacion}\n\n${analysisResult.recomendaciones}`
      : analysisResult.justificacion;

    await supabase.from("meal_logs").insert([{
      patient_id: patientId,
      meal_type: mealType,
      is_compliant: analysisResult.cumple_estandar,
      feedback,
    }]);

    return NextResponse.json({ result: analysisResult });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
