// Lógica de análisis de comida con Claude. Aislada del route para mantener
// el handler HTTP delgado y testeable.
//
// Estrategia de tokens:
//  - System dividido en bloque estático (cacheable) + bloque dinámico.
//  - Tool calling forzado => salida SIEMPRE en JSON estricto, sin prosa.
//  - Reglas que exigen brevedad => mínimos tokens de salida.

import type Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-6";
export const MAX_TOKENS = 256; // techo duro de salida

// Límite de tamaño del base64 recibido (~1.5 MB). El cliente ya redimensiona a
// 1024px/JPEG (~200KB), así que esto solo frena payloads abusivos.
export const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

export type MealAnalysis = {
  cumple_estandar: boolean;
  justificacion: string;
  recomendaciones?: string;
};

// Bloque estático y cacheable: rol + reglas. No cambia entre llamadas, por lo
// que Claude lo sirve desde caché (~90% de descuento) durante ~5 min.
export const SYSTEM_RULES = `Eres el nutricionista del paciente. Analizas la foto de su plato contra su dieta y respondes SIEMPRE con la herramienta report_meal_analysis.

Estilo (obligatorio):
- Directo, claro y breve. Hablas en segunda persona ("tu plato").
- PROHIBIDO ser poético, florido o usar relleno. Sin saludos ni despedidas.
- justificacion: UNA sola frase, máx 15 palabras.
- recomendaciones: opcional, máx 2 ítems con guion, cada uno máx 8 palabras. Omítelo si no hay nada que mejorar.

Criterio (flexible):
- cumple_estandar = true si el plato es esencialmente correcto (componentes principales presentes, variaciones menores OK).
- cumple_estandar = false solo si falta lo principal, hay prohibidos relevantes, o es otra comida.
- Ante ambigüedad asume lo razonable y conviértelo en recomendación, no en falla.

Imagen sin comida o borrosa:
- cumple_estandar = false
- justificacion = "No pude ver bien tu plato, envíame otra foto más clara."
- Sin recomendaciones.`;

export function buildDynamicContext(dietInstructions: string, mealType: string): string {
  return `Dieta del paciente: "${dietInstructions}"\nComida que intenta consumir: ${mealType}.`;
}

export const MEAL_TOOL: Anthropic.Tool = {
  name: "report_meal_analysis",
  description: "Reporta la evaluación breve del plato frente a la dieta.",
  input_schema: {
    type: "object",
    properties: {
      cumple_estandar: {
        type: "boolean",
        description: "true si el plato cumple lo esencial; false si está fuera de la dieta o no se ve comida.",
      },
      justificacion: {
        type: "string",
        description: "UNA frase, máx 15 palabras. Sin prosa.",
      },
      recomendaciones: {
        type: "string",
        description: "Opcional. Máx 2 guiones, cada uno máx 8 palabras. Omitir si no aplica.",
      },
    },
    required: ["cumple_estandar", "justificacion"],
  },
};

// Extrae el resultado estructurado del bloque tool_use. Devuelve null si el
// modelo no usó la herramienta (no debería pasar con tool_choice forzado).
export function extractAnalysis(content: Anthropic.ContentBlock[]): MealAnalysis | null {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === MEAL_TOOL.name) {
      return block.input as MealAnalysis;
    }
  }
  return null;
}
