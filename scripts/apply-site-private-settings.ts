import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Cria a tabela site_private_settings (faltando no banco Neon).
// Definida em supabase/migrations/015 e em lib/db/schema.ts.
// RLS pulada de proposito: o Neon nao tem as funcoes Supabase (current_user_is_admin);
// a authz neste repo e feita no app via JWT (requireRole). Idempotente.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }
  const sql = neon(databaseUrl)

  console.log("Criando tabela site_private_settings (se nao existir)...")
  await sql`
    CREATE TABLE IF NOT EXISTS public.site_private_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  // Migra eventual config legada de google_calendar de site_settings, se existir.
  await sql`
    INSERT INTO public.site_private_settings (key, value, updated_at)
    SELECT key, value, updated_at FROM public.site_settings WHERE key = 'google_calendar'
    ON CONFLICT (key) DO NOTHING
  `

  const cols: any = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_private_settings'
    ORDER BY ordinal_position
  `
  console.log("Colunas:", cols.map((c: any) => c.column_name).join(", "))
  const rows: any = await sql`SELECT key FROM public.site_private_settings`
  console.log(`Linhas existentes: ${rows.length}${rows.length ? " (" + rows.map((r: any) => r.key).join(", ") + ")" : ""}`)
  console.log("site_private_settings aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
