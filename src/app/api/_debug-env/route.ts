// ENDPOINT TEMPORAL DE DEBUG — BORRAR DESPUÉS DE RESOLVER EL ISSUE DE ENV VARS.
// No expone valores, solo si las variables están presentes y su longitud.
import { NextResponse } from "next/server";

export async function GET() {
  const expected = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ];

  const status = expected.map((name) => {
    const value = process.env[name];
    return {
      name,
      present: !!value,
      length: value?.length ?? 0,
      prefix: value ? value.slice(0, 4) : null,
    };
  });

  const allSupabaseKeys = Object.keys(process.env).filter((k) =>
    k.toLowerCase().includes("supabase")
  );
  const allAnthropicKeys = Object.keys(process.env).filter((k) =>
    k.toLowerCase().includes("anthropic")
  );

  return NextResponse.json({
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    vercel_env: process.env.VERCEL_ENV ?? "(not on vercel)",
    deploy_url: process.env.VERCEL_URL ?? null,
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    expected,
    status,
    all_supabase_keys_seen: allSupabaseKeys,
    all_anthropic_keys_seen: allAnthropicKeys,
  });
}
