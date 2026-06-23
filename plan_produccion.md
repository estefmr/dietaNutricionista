# Plan de Despliegue a Producción — NutriAI

Guía técnica y comercial para llevar el MVP (Next.js 16 + Supabase + Claude API) a producción de forma segura, escalable y sostenible en costos.

---

## 1. Recomendación de stack en producción

Para esta web app la combinación óptima es:

| Capa | Servicio recomendado | Por qué |
|---|---|---|
| **Hosting de la app Next.js** | **Vercel** (plan Pro, $20/mes) | Es la plataforma de los creadores de Next.js. Soporta App Router nativo, despliegue automático desde Git, CDN global, SSL gratis, variables de entorno cifradas, edge functions y rollbacks instantáneos. Cero configuración. |
| **Base de datos + auth secundaria** | **Supabase** (plan Pro, $25/mes) | Ya está integrado al proyecto. El plan Pro incluye 8 GB de Postgres, backups diarios automáticos, mejor rendimiento y soporte. El plan Free funciona, pero pausa el proyecto tras 7 días sin actividad — inviable para producción. |
| **API de IA** | **Anthropic Claude API** (pay-per-use) | Ya está integrado. El cobro es por tokens reales consumidos; con prompt caching y resize de imagen ya implementados, el costo por análisis es ~$0.01–0.02 USD. |
| **Dominio** | **Cloudflare Registrar** o **Namecheap** ($10–15/año) | Cloudflare es el más barato y sin upsells. El DNS también es gratis. |
| **Errores y observabilidad** | **Sentry** (plan Free, 5k eventos/mes) | Captura excepciones del frontend y backend, traza errores con stack completo. |
| **Notificaciones a usuarios** | **WhatsApp por enlace `wa.me`** (ya implementado) | Sin API ni costo. Suficiente para el MVP. |

> **Alternativas válidas si quieres pagar menos:** Railway ($5/mes + uso) o Render ($7/mes) para Next.js, con el mismo Supabase + Anthropic. Pierdes la integración nativa con Next.js que tiene Vercel (rollbacks, ISR, edge cache) pero ganas pricing más predecible.

---

## 2. Características mínimas que debe tener el hosting

Si decides comprar otro hosting en lugar de Vercel, **verifica que cumpla todo lo siguiente**:

### Imprescindibles
- [ ] **Soporte para Node.js 20+** corriendo en el servidor (no solo sitios estáticos). Next.js 16 usa App Router con Server Components, API Route Handlers y `bcryptjs` en backend — necesita un runtime de Node.
- [ ] **Build automático desde Git** (push a `main` = nuevo deploy).
- [ ] **HTTPS / SSL gratuito y automático**. Obligatorio porque la cámara del móvil solo funciona en HTTPS, y porque transmitimos contraseñas.
- [ ] **Variables de entorno cifradas** (no en el repo). Mínimo: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Custom domain con DNS configurable** (CNAME / A records).
- [ ] **Function timeout ≥ 30 segundos** para la ruta `/api/analyze-meal`. Claude tarda 3–8 segundos analizando una imagen; con margen para reintentos quedamos cómodos.
- [ ] **Payload máximo de request ≥ 5 MB**. Las imágenes ya van comprimidas a ~150 KB, pero el margen evita rechazos.
- [ ] **Logs accesibles** del backend en tiempo real (para debug en prod).
- [ ] **Región de despliegue cercana a la región de Supabase**. Idealmente la misma (ej. ambos en `us-east-1`) para minimizar latencia DB.

### Deseables
- [ ] **CDN global** para servir el frontend con baja latencia desde cualquier país.
- [ ] **Rollback con un click** a un deploy anterior si algo se rompe.
- [ ] **Preview deploys por rama / PR** para probar cambios antes de fusionar a `main`.
- [ ] **Analytics integrado** (pageviews, web vitals).
- [ ] **Edge functions o middleware** para rate limiting sin servidor extra.

### Lo que **NO** necesitas
- ❌ Almacenamiento de archivos del lado del servidor: las imágenes se procesan en memoria y se descartan tras enviarlas a Claude.
- ❌ Servidor de correo: las credenciales se envían por WhatsApp con `wa.me/`.
- ❌ Redis / cache externo: el caching de IA lo gestiona Anthropic vía prompt caching.
- ❌ Balanceador de carga ni autoscaling manual: Vercel/Railway/Render lo hacen automáticamente.

---

## 3. Checklist pre-lanzamiento

Estas son las cosas que **hay que arreglar antes** de exponer el proyecto a usuarios reales.

### Seguridad
- [ ] **Rotar `ANTHROPIC_API_KEY`** — la actual fue expuesta en chats; generar una nueva en https://console.anthropic.com/settings/keys y guardarla solo en Vercel como variable de entorno.
- [ ] **Eliminar `.env.local` del repositorio** si está commiteado. Confirmar que `.env*.local` esté en `.gitignore`.
- [ ] **Habilitar Row Level Security (RLS) en Supabase** sobre las tablas `patients` y `meal_logs`. Hoy la `anon key` puede leer/escribir todo desde el cliente — un atacante con la key del bundle podría dumpear pacientes. Política recomendada: solo permitir lectura/escritura a través de las API Routes del servidor, usando una `service_role key` interna (no pública).
- [ ] **Rate limiting en `/api/auth/login`** — sin esto, fuerza bruta de contraseñas es trivial. Implementar con `@upstash/ratelimit` o middleware: máximo 5 intentos por IP por minuto.
- [ ] **Rate limiting en `/api/analyze-meal`** — un atacante podría hacer cientos de POST con imágenes basura y vaciar tu crédito de Anthropic. Límite sugerido: 30 análisis por paciente por hora.
- [ ] **Validar tamaño y tipo de imagen en el servidor** (no solo en el cliente). Rechazar > 2 MB y MIMEs distintos de jpeg/png/webp.
- [ ] **Cabeceras de seguridad** en `next.config.ts`: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP básica.
- [ ] **Confirmar contraseñas hasheadas con bcrypt en BD** — ya está implementado con 10 rounds.

### Datos y privacidad
- [ ] **Política de privacidad y términos de servicio** publicados. Maneja datos de salud (peso, medidas, foto del cuerpo): aunque sea un MVP, el usuario debe consentir explícitamente.
- [ ] **Aviso legal sobre la IA**: el análisis es una guía, no un dictamen médico. El responsable clínico es siempre el nutricionista.
- [ ] **Compliance regional**:
  - Latinoamérica: cumplir leyes locales de protección de datos (Habeas Data en Colombia, LGPD en Brasil, Ley 25.326 en Argentina, etc.)
  - UE / usuarios europeos: GDPR — derecho al olvido, base legal del tratamiento, encargado de datos.
  - EE.UU.: si hay médicos profesionales involucrados, evaluar HIPAA — Supabase y Vercel **no** son HIPAA-compliant en sus planes estándar. Podría requerir BAA específico (caro).
- [ ] **Retención de imágenes**: hoy las fotos no se almacenan, solo el feedback textual. Confirmar que esto siga así o documentar política de retención si se decide guardarlas.
- [ ] **Borrado de cuenta del paciente**: implementar opción para que el nutricionista elimine pacientes y sus `meal_logs` asociados (cascade delete en Supabase).

### Configuración técnica
- [ ] **Configurar dominio en Vercel** y apuntar el DNS desde el registrar.
- [ ] **Whitelist del dominio en Supabase** → Project Settings → API → Allowed origins.
- [ ] **Alertas de billing en Anthropic** (https://console.anthropic.com/settings/billing) — notificación al 50%, 80% y 100% del presupuesto mensual previsto.
- [ ] **Alertas de billing en Vercel y Supabase** del mismo modo.
- [ ] **Habilitar backups de Supabase** (incluido en plan Pro, verificar que estén activos).
- [ ] **Probar el flujo completo en mobile real** (iOS y Android, Chrome y Safari) antes del lanzamiento.
- [ ] **Verificar Lighthouse score** ≥ 90 en Performance y Accessibility.
- [ ] **Configurar `next.config.ts` con `turbopack.root`** para silenciar el warning de lockfiles múltiples.

### Performance y UX
- [ ] **Quitar la página de inicio de Next.js** (`/`) y redirigir a `/login` desde el `page.tsx` raíz, o convertirla en landing pública.
- [ ] **Eliminar `console.log` y `console.error` con datos sensibles** del bundle.
- [ ] **Optimizar fonts** — ya usa Inter vía CSS; considerar mover a `next/font` para mejor LCP.
- [ ] **PWA manifest e iconos** si quieres que los pacientes puedan "instalar" la app en su pantalla de inicio. Es un toque premium que cuesta poco implementar.

---

## 4. Pasos de despliegue (Vercel)

1. **Crear cuenta en Vercel** con el mismo correo que GitHub. Habilitar el plan Pro ($20/mes).
2. **Subir el código a GitHub** (repositorio privado).
3. **Importar el repo desde Vercel** (dashboard → New Project → Import).
4. **Configurar el root directory** como `webapp/` (porque el proyecto está anidado).
5. **Agregar variables de entorno** en Vercel:
   - `ANTHROPIC_API_KEY` → la nueva key rotada
   - `NEXT_PUBLIC_SUPABASE_URL` → tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → tu anon key
   - (Cuando implementes RLS) `SUPABASE_SERVICE_ROLE_KEY` → solo en servidor, no `NEXT_PUBLIC_`
6. **Primer deploy automático** — Vercel detecta Next.js, instala dependencias y compila.
7. **Comprar el dominio** (ej. `nutriai.app` en Cloudflare Registrar).
8. **Apuntar el DNS al deploy de Vercel** siguiendo las instrucciones que muestra Vercel → Domains.
9. **Verificar SSL activo** (se aprovisiona en 5–10 min).
10. **Probar el flujo end-to-end en producción**:
    - Crear paciente desde `/dashboard/nutritionist`
    - Enviar credenciales por WhatsApp
    - Login del paciente en `/login`
    - Subir foto y verificar análisis de Claude
    - Revisar logs en Vercel para confirmar que no hay errores

---

## 5. Variables de entorno requeridas

```env
# Anthropic (servidor solamente)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase (públicas — viajan al cliente)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase (privada — solo cuando implementes RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Opcional
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_APP_URL=https://nutriai.app
```

---

## 6. Estimación de costos mensuales

Para un MVP con **1 nutricionista + 30 pacientes activos**, cada paciente registrando ~3 comidas/día:

| Concepto | Costo estimado |
|---|---|
| Vercel Pro | $20.00 |
| Supabase Pro | $25.00 |
| Dominio (prorrateado anual) | $1.25 |
| Anthropic Claude (90 análisis/día × 30 días = 2,700 análisis × $0.015 promedio) | $40.50 |
| Sentry Free | $0.00 |
| **Total mensual** | **~$87 USD** |

### Escenario de crecimiento (3 nutricionistas, 100 pacientes activos)

| Concepto | Costo estimado |
|---|---|
| Vercel Pro | $20.00 |
| Supabase Pro | $25.00 |
| Dominio | $1.25 |
| Anthropic Claude (300 análisis/día = 9,000/mes × $0.015) | $135.00 |
| **Total mensual** | **~$181 USD** |

> **Optimización futura**: a partir de cierto volumen, vale la pena evaluar Anthropic Batch API (50% de descuento, pero análisis no-realtime — no aplica para feedback inmediato al paciente) o caché extendido de 1 hora si los pacientes hacen ráfagas.

---

## 6-A. Consumo de tokens, comidas/día y pacientes por plan

Análisis detallado de cuánto consume cada análisis de comida y cuántas comidas/pacientes
soporta el sistema según el plan de Claude, Vercel y Supabase. Datos de pricing y límites de
Anthropic verificados a 2026-06 (modelo en uso: **`claude-sonnet-4-6`** — $3.00/MTok input,
$15.00/MTok output).

### Aclaración importante: "planes" de Claude
La API de Anthropic **no se vende por planes con cuota mensual de tokens** (eso son los planes
de consumidor Claude Pro/Max de la app web, que **no sirven** para una app). La API es
**pago por uso** + **usage tiers** que solo regulan: (a) el **tope de gasto mensual** y
(b) los **límites de velocidad** (req/min y tokens/min). "Agotar los tokens del mes" significa,
entonces, llegar al **límite de gasto** que tú configures o al tope del tier.

### 1. Tokens consumidos por cada análisis de comida

| Componente | Tokens (aprox.) | Notas |
|---|---|---|
| Imagen (redimensionada ~1024px) | ~1.200 | Visión escala con área: ≈ (ancho×alto)/750 |
| Bloque estático del system + herramienta | ~700 | Reglas + esquema de `report_meal_analysis` |
| Bloque dinámico (dieta + tipo de comida) | ~150 | Varía según el largo de la dieta |
| Texto "Analiza este plato." | ~5 | |
| **Total INPUT por análisis** | **~2.050** | |
| **Total OUTPUT por análisis** | **~100** | JSON del tool; tope duro `max_tokens: 256` |

> ⚠️ **Sobre el prompt caching:** el prefijo cacheable (herramienta + bloque estático ≈ 700
> tokens) queda **por debajo del mínimo de 2.048 tokens de Sonnet 4.6**, así que el caching
> **no se activa** y no aplica el descuento del 90%. Todos los cálculos de abajo costean el
> input completo (postura conservadora). Como el bloque estático es chico, el ahorro perdido es
> marginal: el costo lo domina la imagen, no el system.

### 2. Costo por análisis según el modelo de Claude

INPUT ~2.050 tok · OUTPUT ~100 tok:

| Modelo | Input ($/MTok) | Output ($/MTok) | **Costo por análisis** |
|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | **~$0.0026** (~0,26¢) |
| **Claude Sonnet 4.6** (actual) | $3.00 | $15.00 | **~$0.008** (~0,8¢) |
| Claude Opus 4.8 | $5.00 | $25.00 | **~$0.013** (~1,3¢) |

### 3. Comidas/día que se pueden analizar sin agotar el gasto del mes

Con el modelo actual (Sonnet 4.6, ~$0.008/análisis), según el **presupuesto mensual** que fijes:

| Presupuesto mensual | Análisis/mes | **Comidas/día** |
|---|---|---|
| $20 | ~2.500 | **~83/día** |
| $50 | ~6.250 | **~208/día** |
| $100 | ~12.500 | **~416/día** |
| $500 (tope del Tier 1/2) | ~62.500 | **~2.083/día** |

**Tope por usage tier (gasto mensual máximo antes de tener que subir de tier):**

| Tier | Depósito para alcanzarlo | Tope de gasto/mes | Análisis/mes (Sonnet) |
|---|---|---|---|
| Tier 1 | $5 | $500 | ~62.500 |
| Tier 2 | $40 | $500 | ~62.500 |
| Tier 3 | $200 | $1.000 | ~125.000 |
| Tier 4 | $400 | $200.000 | ~25.000.000 |

> **Los límites de velocidad NO son el cuello de botella aquí.** En Tier 1, Sonnet 4.x permite
> 50 req/min y 30.000 tokens input/min → ~14 análisis por minuto (~840/hora). Un solo
> nutricionista nunca se acerca a eso. La capacidad real la define el **presupuesto**, no la
> velocidad.

### 4. Cuántos pacientes soporta el sistema

**Supuesto:** 3 comidas/día por paciente → **90 análisis/mes por paciente**.

**Costo de IA por paciente/mes, y pacientes soportados por presupuesto:**

| Modelo | Costo/paciente/mes | Pacientes con $20/mes | Pacientes con $50/mes | Pacientes con $100/mes |
|---|---|---|---|---|
| Haiku 4.5 | ~$0.23 | ~85 | ~213 | ~427 |
| **Sonnet 4.6** (actual) | ~$0.72 | ~27 | ~69 | ~138 |
| Opus 4.8 | ~$1.15 | ~17 | ~43 | ~86 |

#### Límite por Vercel

- **Estado actual: el proyecto está en plan Hobby (gratis).** Hobby **prohíbe uso comercial**
  por ToS → para cobrar por el producto hay que pasar a **Pro ($20/mes)**. El motivo de migrar
  es legal/confiabilidad, **no** capacidad.
- **Capacidad:** cada análisis = 1 invocación serverless (~3-8s). 100 pacientes × 90/mes =
  9.000 invocaciones/mes, consumo ínfimo (~12 GB-hora) frente al cupo de Pro (1.000 GB-hora) y
  al ancho de banda (las imágenes van comprimidas a ~150-200 KB). **Vercel soporta cientos de
  pacientes sin despeinarse**; no es el límite para la cantidad de pacientes.

#### Límite por Supabase

- **Tamaño de datos:** una fila de `meal_logs` pesa ~150-250 bytes. 100 pacientes × 90/mes × 12
  meses ≈ 108.000 filas/año ≈ **~25 MB/año**. El plan Free trae 500 MB y el Pro 8 GB → el tamaño
  **nunca** es el cuello de botella (años de margen).
- **El verdadero motivo de pasar a Pro ($25/mes)** es que el plan Free **pausa el proyecto tras
  7 días de inactividad** y no trae backups diarios — inviable para producción. No es por
  cantidad de pacientes.

#### Conclusión de capacidad

> El **único costo que escala con los pacientes es Claude** (~$0.72/paciente/mes en Sonnet).
> Vercel y Supabase, en sus planes de entrada ($20 + $25/mes), soportan **cientos** de pacientes
> sin problema de capacidad — se contratan por ToS/confiabilidad, no por volumen. Para el caso
> típico de **1 nutricionista con 30-100 pacientes**, la IA cuesta **~$22-72/mes** y toda la
> infraestructura queda holgada.

---

## 7. Roadmap post-lanzamiento (no bloqueante)

Mejoras que pueden esperar al post-MVP pero conviene tener en el radar:

1. **Migración de `localStorage` a httpOnly cookies** para sesiones más seguras (resiste XSS).
2. **Almacenamiento de fotos en Supabase Storage** si el nutricionista quiere revisar el historial visual de comidas (no solo el texto). Requiere política de retención y consentimiento explícito.
3. **Notificaciones push** vía PWA para recordar al paciente registrar comidas.
4. **Dashboard de métricas para el nutricionista**: porcentaje de cumplimiento por paciente, tendencias semanales.
5. **Exportar reportes en PDF** del avance del paciente.
6. **Internacionalización** (i18n) si planeas atender mercados no hispanohablantes.
7. **Tests automatizados** mínimos: e2e con Playwright para el flujo login + análisis.
8. **CI con GitHub Actions** que corra lint + typecheck en cada PR antes de fusionar a `main`.

---

## 8. Plan de contingencia

Qué hacer si algo se rompe en producción:

| Síntoma | Acción inmediata |
|---|---|
| Deploy roto | Rollback con un click en Vercel al deploy anterior estable |
| Claude API caída | Mostrar mensaje amable al paciente: "El análisis está temporalmente no disponible, vuelve a intentarlo en unos minutos" |
| Supabase caída | Idem; el login fallará. Monitorear https://status.supabase.com |
| Gasto descontrolado en Anthropic | Rotar la key inmediatamente para detener el sangrado, investigar logs |
| Filtración de credenciales | Resetear `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Forzar logout global limpiando `localStorage` con un cambio de versión en la app shell |

---

*Documento de despliegue del MVP NutriAI. Mantenlo actualizado a medida que evoluciona la arquitectura.*
