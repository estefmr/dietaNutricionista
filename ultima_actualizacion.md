# Documento de Última Actualización: Sistema de Autenticación y Conexión Paciente-Nutricionista

Este documento detalla los cambios técnicos y de experiencia de usuario (UX) implementados en la última versión del MVP de la plataforma de nutrición. El objetivo principal de estos cambios es eliminar la dependencia de enlaces rápidos con IDs visibles y fortalecer el vínculo emocional del paciente con su nutricionista en lugar de la inteligencia artificial.

---

## 🛠️ Resumen de Cambios Técnicos

### 1. Base de Datos (Supabase)
Se agregaron nuevos campos a la estructura de la tabla `patients` para soportar las credenciales de acceso:
- `username` (Texto): Nombre de usuario único del paciente para iniciar sesión.
- `password_hash` (Texto): Contraseña del paciente almacenada de forma segura mediante encriptación unidireccional.

### 2. Capa de Seguridad y APIs
Se crearon las siguientes rutas de backend para gestionar las credenciales de acceso:
- **API de Login (`/api/auth/login`):** Valida el usuario, obtiene el hash de la base de datos y compara contraseñas usando `bcryptjs`. Si son correctas, expide la confirmación para iniciar sesión en el cliente.
- **API de Asignación de Credenciales (`/api/auth/set-credentials`):** Toma la contraseña legible enviada por el nutricionista, la encripta en un hash con 10 rondas de sal (encriptación segura) y actualiza el registro del paciente con el nuevo usuario y hash.

---

## 🎨 Cambios en la Experiencia de Usuario (UX/UI)

### 👥 Rol del Paciente
- **Pantalla de Inicio de Sesión (`/login`):**
  - Interfaz limpia y premium con el logo de NutriAI.
  - Campos de entrada para **Usuario** y **Contraseña** con visibilidad de contraseña alternable (icono de ojo 👁️/🙈).
  - Guarda la sesión persistente en `localStorage` (`nutriai_patient_id` y `nutriai_patient_name`).
- **Seguridad en Rutas:** El panel `/dashboard/patient` ahora redirige automáticamente a `/login` si no detecta una sesión válida en el dispositivo del paciente.
- **Cierre de Sesión Seguro:** En la pestaña **Mi Perfil**, se agregó un botón premium de **Cerrar Sesión** en color rojo suave (`fef2f2` con texto `ef4444`) que limpia el almacenamiento del navegador y redirige al inicio.
- **Enfoque Humano:** Se retiraron textos y terminología que hacían referencia a la IA (ej. *"Analiza tu plato con IA"*, *"Analizando..."*). Ahora se orienta a la supervisión médica (ej. *"Tu nutricionista lo revisará"*, *"Enviar foto al nutricionista"*, *"Evaluando tu plato con las indicaciones de tu nutricionista"*).

### 🩺 Rol del Nutricionista (`/dashboard/nutritionist`)
- **Autogeneración Inteligente:** Al escribir el nombre de un paciente nuevo, el sistema sugiere en tiempo real un usuario simplificado (ej: "maría.gonzález" a partir de "María González") y una contraseña segura aleatoria de 6 caracteres (letras y números).
- **Control Total:** El nutricionista tiene la opción de editar estos campos autogenerados antes de guardar el registro si prefiere credenciales personalizadas.
- **Botón Directo de WhatsApp:** Al registrar un paciente, se proporciona un botón verde brillante para **Enviar por WhatsApp**, que pre-redacta un mensaje formateado con negritas que incluye:
  - Saludo personalizado.
  - Enlace de acceso a `/login`.
  - El nombre de usuario y contraseña generados.
- **Gestión desde Detalle del Paciente:**
  - Se eliminó el enlace de acceso directo que puenteaba el login.
  - Se integró un módulo de control de accesos para ver el usuario del paciente, restablecer su contraseña al instante (hasheándola de nuevo) y compartirla por WhatsApp o copiarla al portapapeles.

---

## 📈 Beneficios del Cambio
- **Mayor Seguridad:** Los pacientes ya no pueden ser suplantados adivinando IDs en la URL; requieren credenciales válidas.
- **Compatibilidad Multidispositivo:** El paciente puede abrir su portal en su celular, tablet o computadora simplemente iniciando sesión tradicional.
- **Facilidad de Envío:** El nutricionista no tiene que redactar instrucciones manuales; con un solo botón en su panel, todo el flujo de entrega se realiza por WhatsApp.
- **Conexión Nutricionista-Paciente:** La IA actúa como un motor silencioso que trabaja en favor del nutricionista, evitando que el paciente sienta frialdad tecnológica y fortaleciendo la fidelidad al tratamiento guiado por su médico.
