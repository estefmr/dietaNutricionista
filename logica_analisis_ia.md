# Lógica de Análisis de Imágenes con IA en Producción

**Proyecto:** MVP SaaS Nutrición con IA  
**Motor de IA:** Claude (Anthropic) — API de Visión (Vision API)  
**Archivo responsable:** `src/app/api/analyze-meal/route.ts`

---

## ¿Qué sucede cuando el paciente presiona "Analizar Plato"?

El flujo completo ocurre en milisegundos y de forma completamente segura del lado del servidor. A continuación se detalla paso a paso:

---

## Paso 1 — El paciente sube la imagen (Navegador/Celular)

El paciente selecciona una foto desde su dispositivo (celular, tablet o computadora). Antes de salir del navegador, la imagen pasa por una **fase de redimensionado en cliente** (`resizeImageToDataUrl` en `src/app/dashboard/patient/page.tsx`), que la dibuja en un `<canvas>` escalada a un máximo de **1024 px** por lado y la exporta como **JPEG calidad 0.85**. Solo después de esa compresión se convierte a **Base64** y se envía al backend.

Esta etapa es crítica para el costo: en Claude, los tokens de visión escalan con el área en píxeles. Una foto típica de móvil (≈ 4000 × 3000 ≈ 12 MP) cuesta aproximadamente **1500 tokens de visión por llamada**; tras el resize a 1024 px se reduce a ≈ **200–300 tokens**, recortando ~80% del gasto de imagen sin perder fidelidad visual para que Claude identifique los alimentos.

```
[Imagen del plato del paciente: 4000×3000 ≈ 4 MB]
       ↓ (Canvas resize → max 1024 px, JPEG 0.85)
[Imagen optimizada: ≈ 1024×768 ≈ 150 KB]
       ↓ (canvas.toDataURL)
"data:image/jpeg;base64,/9j/4AAQSkZJRg..."
       ↓ (HTTP POST a /api/analyze-meal)
[Servidor de Next.js]
```

---

## Paso 2 — El servidor consulta la dieta del paciente (Base de Datos)

Antes de llamar a la IA, el servidor necesita saber exactamente qué dieta le asignó el nutricionista a ese paciente. Para ello, con el ID único del paciente (que viene en la URL), realiza una consulta a **Supabase (PostgreSQL)**:

```sql
SELECT diet_instructions 
FROM patients 
WHERE id = 'f8c65f3a-...'
```

Esto devuelve el texto libre que el nutricionista ingresó, por ejemplo:
> "Desayuno: 2 huevos revueltos, 1 rebanada de pan integral, café sin azúcar. Máximo 400 calorías y priorizar proteína."

Si el ID no existe o hay un error de conexión, el servidor responde con un error controlado `404` antes de siquiera llamar a la IA, ahorrando tokens y costos.

---

## Paso 3 — Ensamblado del Prompt (El Cerebro del Sistema)

Esta es la parte más crítica. El servidor construye un `System Prompt` (instrucciones maestras que Claude recibe de forma invisible para el usuario). Para reducir costos, el prompt se envía como un **arreglo de bloques de texto** en lugar de un único string: un **bloque estático cacheable** y un **bloque dinámico** específico de cada llamada.

```typescript
system: [
  {
    type: "text",
    text: `Eres un experto nutricionista evaluador. Tu tarea es analizar la imagen
de un plato de comida y contrastarla con las instrucciones de dieta asignadas al paciente.

Instrucciones Críticas:
1. Analiza cuidadosamente las porciones, ingredientes y tipo de cocción (si es visible).
2. Determina si el plato cumple o no cumple con la dieta.
3. Si la imagen NO es comida o es muy borrosa, el veredicto es 'No cumple' y la
   justificación debe ser EXACTAMENTE: 'No pudimos identificar comida en la imagen, 
   por favor sube una imagen más nítida.'
4. Si NO concuerda exactamente con la dieta, indica de forma concisa QUÉ falta o
   QUÉ sobra en la comida según la dieta.`,
    cache_control: { type: "ephemeral" }   // ← Activa Prompt Caching
  },
  {
    type: "text",
    text: `Instrucciones de dieta del paciente:
"[DIETA DEL NUTRICIONISTA INSERTADA DINÁMICAMENTE]"

El paciente está intentando consumir un(a): [TIPO DE COMIDA].`
  }
]
```

El prompt tiene cuatro grandes ventajas de diseño:
- **Inyección dinámica:** Cada llamada lleva los datos reales y específicos del paciente, no datos genéricos.
- **Instrucciones de error definidas:** El propio prompt le dice a Claude exactamente qué texto devolver si la imagen no es válida. Esto evita respuestas inesperadas.
- **Concisión forzada:** Las instrucciones no le dejan "margen de creatividad" a Claude, obligándolo a ser directo y preciso.
- **Cacheable:** El bloque estático (rol + reglas) lleva el flag `cache_control: { type: "ephemeral" }`. Claude lo guarda en caché durante ~5 minutos y, en cualquier llamada subsiguiente que repita exactamente el mismo bloque, cobra solo el ~10% de su costo normal de input tokens (descuento del **90%** sobre la porción cacheada). El bloque dinámico (la dieta de cada paciente y el tipo de comida) queda fuera del caché porque cambia entre llamadas.

---

## Paso 4 — Llamada a Claude con Tool Calling (Optimización de Tokens)

Este es el elemento técnico diferenciador del proyecto y el que más impresiona al cliente. En lugar de pedirle a Claude que "describa lo que ve en la imagen en formato JSON" (lo que podría llevarlo a salirse del formato), usamos la función de **Tool Calling** (también llamada **Function Calling**).

**¿Qué es Tool Calling?**  
Es una función avanzada de Claude que le permite "llenar un formulario estructurado" en lugar de generar texto libre. Le definimos una herramienta llamada `report_meal_analysis` con un esquema de datos exacto y le ordenamos que OBLIGATORIAMENTE use esa herramienta para responder:

```json
// Esquema de datos (el "formulario" que debe llenar Claude)
{
  "cumple_estandar": boolean,  // true o false, nada más
  "justificacion": string      // texto corto y directo
}
```

```typescript
// Configuración en el código
tool_choice: { type: "tool", name: "report_meal_analysis" }
```

El parámetro `tool_choice: "tool"` es fundamental: le **prohíbe** a Claude responder con texto libre y lo **obliga** a usar la herramienta definida. Claude internamente analiza la imagen, razona sobre la dieta, pero su salida siempre será el JSON estructurado. Esto tiene dos beneficios clave:

| Beneficio | Explicación |
|---|---|
| **Ahorro de tokens** | Claude no desperdicia tokens en saludos, explicaciones poéticas ni párrafos innecesarios. La salida es mínima y directa. Además se fuerza un techo con `max_tokens: 300`. |
| **Confiabilidad** | La respuesta siempre tiene el mismo formato, lo que permite al frontend leerla de forma determinista sin parseo complejo. |

---

## Paso 5 — Claude Analiza la Imagen (Visión Artificial)

Claude recibe en un mismo request:
- El **System Prompt** con las reglas del negocio y la dieta del paciente.
- La **imagen del plato** en formato Base64.
- El **texto de instrucción**: "Analiza este plato."

Claude internamente usa su modelo de visión para:
1. Identificar los alimentos presentes en el plato.
2. Estimar porciones y tipo de cocción (si es posible).
3. Comparar el contenido detectado con las instrucciones de la dieta.
4. Generar un veredicto booleano (`true`/`false`) y una justificación corta.

---

## Paso 6 — Extracción del Resultado y Guardado en Base de Datos

El servidor extrae el resultado del bloque `tool_use` de la respuesta de Claude:

```typescript
for (const block of response.content) {
  if (block.type === 'tool_use' && block.name === 'report_meal_analysis') {
    analysisResult = block.input; // { cumple_estandar: false, justificacion: "..." }
  }
}
```

El resultado se guarda en la tabla `meal_logs` de Supabase (historial de comidas del paciente) y se devuelve al navegador del paciente en menos de 3 segundos.

---

## Paso 7 — Veredicto Presentado al Paciente

El navegador recibe el objeto JSON, lo interpreta y muestra al paciente:

**Si cumple la dieta:**
> ✅ **¡Aprobado!**  
> "El plato contiene los huevos revueltos y el pan integral indicados. Las porciones estimadas están dentro del límite calórico."

**Si no cumple la dieta:**
> ❌ **No cumple la dieta**  
> "Falta la rebanada de pan integral. El plato parece tener cereal azucarado en su lugar, lo cual no está en la dieta."

**Si la imagen no es comida o es muy borrosa:**
> ❌ **No cumple la dieta**  
> "No pudimos identificar comida en la imagen, por favor sube una imagen más nítida."

---

## Resumen: Flujo Completo en Producción

```
[Paciente sube foto desde celular/PC]
          ↓
[Navegador redimensiona la foto a 1024 px (canvas) y la convierte a Base64]
          ↓
[POST /api/analyze-meal → Servidor Next.js]
          ↓
[Servidor consulta dieta en Supabase/PostgreSQL]
          ↓
[Servidor construye System Prompt: bloque estático cacheado + bloque dinámico]
          ↓
[Llamada a Claude API con imagen + prompt + Tool Calling + Prompt Caching]
          ↓
[Claude analiza la imagen contra la dieta]
          ↓
[Claude devuelve JSON: { cumple_estandar, justificacion }]
          ↓
[Servidor guarda log en Supabase y devuelve resultado]
          ↓
[Paciente ve el veredicto ✅ / ❌ en pantalla]
```

---

## Sistema de Optimización de Tokens

El proyecto aplica **cuatro técnicas combinadas** para reducir al máximo el costo por análisis de comida:

| # | Técnica | Dónde se aplica | Impacto aproximado |
|---|---|---|---|
| 1 | **Resize de imagen en cliente** (canvas → 1024 px, JPEG 0.85) | `src/app/dashboard/patient/page.tsx` — `resizeImageToDataUrl` | ~80% menos tokens de visión por foto |
| 2 | **Prompt Caching** (`cache_control: { type: "ephemeral" }` en el bloque estático del system) | `src/app/api/analyze-meal/route.ts` | 90% de descuento en input tokens cacheados al haber cache hit (TTL ~5 min) |
| 3 | **Tool Calling forzado** (`tool_choice: { type: "tool", name: "report_meal_analysis" }`) | `src/app/api/analyze-meal/route.ts` | Output mínimo, JSON estructurado, sin "prosa" |
| 4 | **`max_tokens: 300`** como techo de salida | `src/app/api/analyze-meal/route.ts` | Cota dura contra runaways del modelo |

**Comportamiento típico de costos** para un paciente que analiza 4 comidas en una sesión (desayuno, almuerzo, snack y cena, dentro de la ventana de 5 minutos del cache):
- Llamada 1: paga input tokens completos del system + imagen optimizada. Se **escribe** al cache (overhead pequeño).
- Llamadas 2–4: el bloque estático del system se sirve desde cache al **10%** de su precio. La dieta del paciente y el tipo de comida (bloque dinámico) y la imagen se siguen pagando completos, pero son la fracción más chica del prompt.

Esto convierte el costo marginal por comida en una fracción del costo de la primera llamada, manteniendo la calidad del veredicto intacta.

---

## Manejo de Errores en Producción

| Escenario de Error | Comportamiento del Sistema |
|---|---|
| Imagen borrosa o sin comida | Claude lo detecta y devuelve el mensaje de nitidez definido en el prompt |
| Paciente ID no existe en BD | Servidor devuelve `404` sin llamar a Claude (sin gasto de tokens) |
| Imagen en formato inválido | Servidor rechaza antes de llamar a Claude (sin gasto de tokens). El canvas exporta JPEG, así que el regex del servidor `image/(jpeg\|png\|gif\|webp)` siempre matchea para imágenes válidas. |
| Fallo de la API de Anthropic | Try/catch devuelve mensaje de error genérico al usuario |
| Fallo de conexión a Supabase | Servidor devuelve error controlado antes de llamar a Claude |

---

*Documento técnico generado para el MVP SaaS Nutrición + IA.*
