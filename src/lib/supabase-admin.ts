import { createClient } from "@supabase/supabase-js";

// Cliente con service_role key — bypassea RLS.
// SOLO debe importarse desde código que corre en el servidor (API routes,
// Server Components, Server Actions). Nunca desde un "use client" file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabase-admin] SUPABASE_SERVICE_ROLE_KEY no está definida. " +
    "Se usará la clave anon por defecto."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

