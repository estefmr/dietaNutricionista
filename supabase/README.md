# Migraciones de base de datos (Supabase)

El esquema de la base de datos vive **versionado en este repo**, en
`supabase/migrations/`. El esquema en producción ya coincide con la migración
baseline `20260623044633_initial_baseline.sql`.

## Reglas

- **Nunca** edites una migración ya aplicada ni cambies el esquema a mano desde
  el dashboard de Supabase. Todo cambio = una migración nueva.
- Cada migración es un archivo SQL con prefijo de timestamp; se aplican en orden.

## Flujo para un cambio de esquema

```bash
cd webapp
export SUPABASE_ACCESS_TOKEN=<tu-personal-access-token>

# 1. Crear una migración nueva (genera el archivo vacío con timestamp)
npx supabase migration new agregar_campo_x

# 2. Editar el .sql generado en supabase/migrations/ con el cambio (DDL)

# 3. Aplicar a la nube. Requiere la contraseña de la BD
#    (Dashboard → Project Settings → Database → Database password)
npx supabase db push
```

## Estado actual

- Proyecto vinculado: `vqlxsccmvqyvrjsahban`
- Tablas: `patients`, `meal_logs` (ver baseline)
- **RLS habilitado sin políticas**: el acceso es solo server-side vía
  `service_role` (las API Routes en `src/app/api/`). La `anon key` del navegador
  está bloqueada por diseño. Si en el futuro se quiere acceso directo desde el
  cliente, hay que agregar políticas RLS en una migración nueva.

## Notas

- El baseline ya está registrado como aplicado en la nube
  (`supabase_migrations.schema_migrations`), por lo que `db push` no intentará
  recrear las tablas existentes.
- La carpeta `.temp/` (cachea credenciales del CLI) está en `.gitignore`.
