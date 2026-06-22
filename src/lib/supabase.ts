import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente público con anon key. Lazy init para que no crashee en build
// si las env vars no están disponibles a tiempo de compilación.
//
// NOTA: con RLS habilitado, este cliente sirve para muy poco — toda lectura
// de datos sensibles debe pasar por API routes que usen el cliente admin.

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase public env vars missing. Define NEXT_PUBLIC_SUPABASE_URL " +
      "and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  _client = createClient(url, key);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
