# Guía de Pruebas: MVP SaaS Nutrición (Autenticación y Conexión Paciente-Nutricionista)

¡Felicidades! Se ha implementado el sistema de inicio de sesión con usuario y contraseña para el paciente, eliminando los enlaces por ID directo, y agregando una fuerte conexión paciente-nutricionista.

## Nuevas Funcionalidades Implementadas

1. **Autenticación del Paciente (`/login`):**
   - El paciente ya no entra con un enlace directo con token/ID en la URL.
   - Ahora inicia sesión ingresando su **Usuario** y **Contraseña** desde cualquier dispositivo.
   - La sesión se mantiene de forma segura usando `localStorage`.

2. **Panel de Gestión de Accesos (Nutricionista):**
   - **Creación de Pacientes:** Al registrar un nuevo paciente, el sistema sugiere automáticamente un usuario basado en su nombre (ej: "maría.gonzález") y una contraseña segura aleatoria de 6 caracteres. El nutricionista puede editar ambos datos si lo desea.
   - **Compartir por WhatsApp:** Una vez creado, se genera una tarjeta de éxito con un botón para **Compartir por WhatsApp**. Esto abre WhatsApp Web/App con un mensaje personalizado pre-redactado conteniendo el enlace de inicio de sesión, usuario y contraseña sugerida.
   - **Restablecimiento de Contraseña:** Desde la lista de pacientes, al ingresar al perfil detallado de un paciente, el nutricionista puede ver su usuario asignado, restablecer su contraseña (escribiendo una nueva) y compartir las nuevas credenciales directamente por WhatsApp o copiarlas al portapapeles.

3. **Cerrar Sesión:**
   - Se añadió un botón premium de **🚪 Cerrar Sesión** en la pestaña **Mi Perfil** del panel del paciente para limpiar la sesión de forma segura y redirigirlo al login.

4. **Remoción de Textos de IA:**
   - Se ocultó el foco en la IA ("Analiza tu plato con IA", "Sube una foto y la IA la evaluará").
   - Ahora el paciente siente que le está reportando su progreso directamente al nutricionista ("Enviar foto al nutricionista", "Tu nutricionista lo revisará", "Verificando con las indicaciones de tu nutricionista"). La IA ahora actúa de forma invisible por detrás evaluando el cumplimiento.

---

## Cómo Probar el Flujo Completo

### Paso 1: Rol Nutricionista (Crear Paciente con Credenciales)
1. Ve a: [http://localhost:3000/dashboard/nutritionist](http://localhost:3000/dashboard/nutritionist)
2. Ve a la pestaña **Nuevo** para agregar un paciente.
3. Escribe el nombre del paciente (ej: `Carlos Ruiz`). Verás que el usuario (`carlos.ruiz`) y una contraseña (ej: `H82KPA`) se autogeneran al instante.
4. Escribe la dieta asignada y haz clic en **✅ Crear Paciente y Credenciales**.
5. Verás la pantalla de éxito. Copia las credenciales o presiona **💬 Enviar por WhatsApp** para simular el envío al paciente.

### Paso 2: Rol Paciente (Iniciar Sesión y Registrar)
1. Ve a la página de login: [http://localhost:3000/login](http://localhost:3000/login)
2. Ingresa el **Usuario** y la **Contraseña** del paciente creado.
3. Al ingresar, serás redirigido al panel móvil del paciente `/dashboard/patient`.
4. Intenta registrar tu comida en la pestaña **Analizar**, guardar tus datos en **Mi Perfil**, o registrar tu historial físico con foto en **Mi Avance**.
5. Ve a la pestaña **Mi Perfil** y haz clic en **🚪 Cerrar Sesión** para comprobar que el sistema te regresa de manera segura a la página de `/login`.

### Paso 3: Restablecer Contraseña (Nutricionista)
1. Regresa al panel del nutricionista: [http://localhost:3000/dashboard/nutritionist]
2. En la lista de pacientes, haz clic sobre `Carlos Ruiz`.
3. Escribe una nueva contraseña en la sección **Cambiar / Restablecer Contraseña** y haz clic en **Actualizar**.
4. ¡Listo! Se actualizará en la base de datos en tiempo real (hasheada con `bcryptjs`) y podrás enviarle el nuevo acceso por WhatsApp o copiarlo.
