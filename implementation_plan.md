# Plan de Implementación y Propuesta: MVP SaaS Nutrición + IA

Este documento detalla la propuesta técnica, económica y de tiempos sugerida para tu cliente, además del plan de implementación que seguiremos para desarrollar la aplicación.

## Propuesta Comercial (Sugerencia para enviar al cliente)

**1. Presupuesto cerrado:**
*Sugerencia:* **$1,200 - $1,500 USD** (Puedes ajustar este monto según tu tarifa por hora o país. Considera que es un MVP que requerirá de 1 a 2 semanas de desarrollo y pruebas).

**2. Tiempo de entrega:**
*Sugerencia:* **10 días calendario** (Esto contempla 7 días de desarrollo activo + 3 días para pruebas, refinamiento del prompt de IA y despliegue final).

**3. Stack tecnológico propuesto:**
* **Framework Core (Fullstack):** **Next.js (App Router) + TypeScript.** *¿Por qué?* Nos permite desarrollar tanto el Frontend como el Backend (API Routes para la IA) en un solo lugar, maximizando la velocidad de entrega.
* **Base de Datos, Autenticación y Storage:** **Supabase (PostgreSQL).** *¿Por qué?* Proveé de inmediato autenticación, base de datos relacional (ideal para relacionar Nutricionistas -> Pacientes -> Dietas) y almacenamiento (Storage) para guardar las fotos de los platos, todo sin configurar servidores extra.
* **Diseño y UI:** **Tailwind CSS + shadcn/ui.** *¿Por qué?* Permite construir interfaces web de aspecto premium y altamente responsivas (crucial porque el paciente usará su celular para las fotos) de forma ultrarrápida.
* **Inteligencia Artificial:** **Claude 3 Haiku o Claude 3.5 Sonnet (API de Anthropic).** *¿Por qué?* Claude 3 Haiku es extremadamente rápido y económico en tokens, ideal para tareas de visión. 3.5 Sonnet ofrece mayor razonamiento si la dieta es compleja. Usaremos "JSON Mode / Tool Calling" para forzar respuestas precisas y cortas, minimizando el costo de tokens.

---

## User Review Required

> [!IMPORTANT]  
> **Revisión de Propuesta:** Por favor, revisa si estás de acuerdo con el monto de presupuesto y el tiempo de entrega sugeridos para enviárselos a tu cliente. Dime si prefieres que ajustemos estos números.

> [!TIP]  
> Si estás de acuerdo con la propuesta y el stack, usaré este mismo plan para comenzar a crear el proyecto en tu carpeta `c:\Users\estef\OneDrive\Escritorio\Dieta`.

## Open Questions

- ¿Deseas que te redacte un borrador de mensaje/correo listo para copiar y pegar a tu cliente con esta información?
- ¿Para el MVP, está bien si el Nutricionista es quien crea la cuenta del Paciente (generando un acceso rápido) en lugar de un flujo complejo de auto-registro?

## Proposed Changes

La arquitectura técnica del MVP en Next.js se dividirá en:

### 1. Base de Datos (Supabase)
- **Tabla `profiles`**: ID, Rol (`nutritionist` | `patient`).
- **Tabla `diets`**: ID, `nutritionist_id`, `patient_id`, `patient_name`, `instructions` (texto libre).
- **Tabla `meal_logs`**: ID, `patient_id`, `meal_type` (Desayuno, etc.), `image_url`, `is_compliant` (Boolean), `feedback` (Texto IA).

### 2. Frontend: Panel de Nutricionista
- **Ruta:** `/dashboard/nutritionist`
- Formulario sencillo para registrar el nombre del paciente y las indicaciones de la dieta en texto libre.
- Vista del historial de comidas de sus pacientes.

### 3. Frontend: Vista de Paciente
- **Ruta:** `/dashboard/patient`
- Interfaz 100% pensada en móviles (*Mobile-First*).
- Selector del tipo de comida y botón para subir/tomar la foto.
- Tarjeta de "Veredicto" inmediato mostrando "Sí/No" y la justificación.

### 4. Backend y Optimización de IA
- **Ruta API:** `/api/analyze-meal`
- **Estrategia de Tokens:** El *System Prompt* estará estrictamente diseñado para que Claude devuelva **solo un objeto JSON** con este formato: `{"cumple": true/false, "justificacion": "Texto muy breve"}`. Esto cumple el requisito del cliente de evitar "respuestas largas y poéticas" y ahorra costos de salida de tokens.

## Verification Plan

## Automated/Manual Tests
- **Responsive Design:** Probar el flujo de paciente desde la vista de consola móvil (DevTools) para asegurar que la subida de imagen es intuitiva.
- **Prueba de Prompting (Optimización):** Enviar fotos de prueba a Claude asegurándonos de que la respuesta consume la menor cantidad de tokens posible y no se desvía del formato JSON.
- **Prueba de Roles:** Verificar que un Paciente no pueda acceder a las rutas de Nutricionista y viceversa (Rutas Protegidas).
