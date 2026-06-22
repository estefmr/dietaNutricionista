import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente con service_role key — bypassea RLS.
// SOLO debe importarse desde código que corre en el servidor (API routes,
// Server Components, Server Actions). Nunca desde un "use client" file.
//
// Lazy initialization: el cliente real se crea la primera vez que se accede
// a una propiedad, no al cargar el módulo. Esto permite que `next build`
// compile aunque las env vars no estén disponibles en build time (caso típico
// de CI o de un primer deploy antes de configurar variables).

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing on the server. Define NEXT_PUBLIC_SUPABASE_URL " +
      "and SUPABASE_SERVICE_ROLE_KEY in your hosting environment."
    );
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

// Proxy: cada acceso a una propiedad inicializa el cliente la primera vez
// y delega al cliente real. Mantiene la API existente (supabaseAdmin.from(...)).
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
