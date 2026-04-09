import { createClient } from "@supabase/supabase-js"

/**
 * Cria um client Supabase com service role key (admin).
 * Bypass de RLS — usar apenas em API routes do servidor.
 * NUNCA importar este módulo em componentes client-side.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing SUPABASE env vars for admin client")
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
