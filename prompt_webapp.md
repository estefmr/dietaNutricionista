# Prompt eficiente — Web app de nutrición + IA

Prompt compacto y autocontenido para que un agente de IA genere una app como esta.
Diseñado para minimizar tokens: directivas densas, sin relleno.

---

## Prompt (copiar y pegar)

```
Crea un MVP web fullstack: plataforma de nutrición donde un nutricionista asigna
dietas y sus pacientes fotografían comidas para que una IA verifique si cumplen.

STACK: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres),
Anthropic Claude API. Mobile-first.

DATOS (Supabase, RLS ON sin políticas; acceso solo server-side con service_role):
- patients(id uuid pk, name text, diet_instructions text, created_at timestamptz,
  username text, password_hash text)
- meal_logs(id uuid pk, patient_id uuid fk->patients on delete cascade,
  meal_type text, is_compliant bool, feedback text, created_at timestamptz)

RUTAS:
- /login: paciente entra con usuario+contraseña (bcrypt). Sesión en localStorage.
- /dashboard/nutritionist: crea pacientes (autogenera usuario+pass), asigna dieta,
  lista pacientes, ve historial, restablece contraseña, comparte credenciales por
  wa.me. Menú inferior fijo SIEMPRE visible.
- /dashboard/patient: sube foto del plato, ve veredicto, perfil, avances.
- API: /api/analyze-meal, /api/auth/login, /api/auth/set-credentials, /api/patients.

ANÁLISIS IA (núcleo, optimizado en tokens) — /api/analyze-meal:
1. Cliente: redimensionar imagen a max 1024px, JPEG 0.85, a base64 (canvas) ANTES
   de subir. ~80% menos tokens de visión.
2. Servidor: validar entrada y leer diet_instructions; si falta el paciente -> 404
   SIN llamar a la IA.
3. System prompt en 2 bloques: estático cacheable (cache_control ephemeral) con
   rol+reglas, y dinámico (dieta + tipo de comida).
4. Tool calling FORZADO (tool_choice) con schema estricto:
   { cumple_estandar: bool, justificacion: string, recomendaciones?: string }.
   Sin texto libre.
5. max_tokens bajo (~256). Reglas exigen brevedad: justificacion = 1 frase <=15
   palabras; recomendaciones opcional, <=2 guiones. PROHIBIDO tono poético/relleno.
6. Imagen sin comida/borrosa -> cumple_estandar=false + mensaje fijo pidiendo otra foto.
7. Guardar resultado en meal_logs; devolver JSON al cliente.

MANEJO DE ERRORES (diferenciado, sin filtrar mensajes crudos):
- body inválido/falta dato -> 400; imagen grande -> 413; API key ausente -> 503;
  DB caída -> 503; fallo Claude (APIError) -> 502 con mensaje amable; fallo al
  guardar log -> loguear pero igual responder el análisis.

CALIDAD: arquitectura legible (lógica del prompt/tool/tipos en un módulo lib aparte,
handlers HTTP delgados). Validar tipo/tamaño de imagen también en servidor.

ENTREGABLES: código + migración SQL baseline + .env.example
(ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY).
```

---

## Por qué es eficiente (técnicas aplicadas)

| Técnica | Efecto |
|---|---|
| Redimensionado de imagen en cliente (1024px) | ~80% menos tokens de visión |
| Prompt caching del bloque estático del system | ~90% descuento en input repetido |
| Tool calling forzado (JSON estricto) | Salida sin prosa, parseo determinista |
| `max_tokens` bajo + reglas de brevedad | Cota dura y output mínimo |
| Validación previa (404/400 antes de la IA) | Cero tokens en peticiones inválidas |
