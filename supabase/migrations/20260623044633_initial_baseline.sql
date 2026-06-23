-- ============================================================================
-- Migración baseline — refleja el esquema que YA existe en producción
-- (proyecto Supabase: vqlxsccmvqyvrjsahban), capturado el 2026-06-23.
--
-- Es idempotente (IF NOT EXISTS / guards) para poder aplicarse sobre la base
-- de datos actual sin romper nada. Para una BD vacía (staging/local) recrea
-- todo el esquema desde cero.
--
-- A partir de aquí, TODO cambio de esquema debe agregarse como una migración
-- nueva (supabase migration new <nombre>) — nunca editar este archivo ni tocar
-- el esquema a mano desde el dashboard.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: patients
-- Pacientes registrados por el nutricionista + sus credenciales de acceso.
-- ----------------------------------------------------------------------------
create table if not exists public.patients (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  diet_instructions  text        not null,
  created_at         timestamptz not null default timezone('utc'::text, now()),
  username           text,
  password_hash      text
);

-- ----------------------------------------------------------------------------
-- Tabla: meal_logs
-- Historial de comidas analizadas. Una fila por análisis de plato.
-- Borrado en cascada: al eliminar un paciente se borran sus logs.
-- ----------------------------------------------------------------------------
create table if not exists public.meal_logs (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references public.patients(id) on delete cascade,
  meal_type     text        not null,
  is_compliant  boolean     not null,
  feedback      text,
  created_at    timestamptz not null default timezone('utc'::text, now())
);

-- Índice para acelerar la consulta del historial por paciente.
create index if not exists meal_logs_patient_id_idx
  on public.meal_logs (patient_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- RLS habilitado SIN políticas: bloquea por completo el acceso con la anon key
-- desde el navegador. Toda la app accede vía API Routes server-side usando la
-- service_role key (que bypassa RLS por diseño). Esta es la postura segura
-- recomendada en plan_produccion.md.
-- ----------------------------------------------------------------------------
alter table public.patients  enable row level security;
alter table public.meal_logs enable row level security;
