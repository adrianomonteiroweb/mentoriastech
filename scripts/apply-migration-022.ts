import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Aplica a migration 022 (content_suggestions) no banco do .env.local.
// Idempotente: pode rodar mais de uma vez.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Aplicando migration 022...")

  await sql`
    CREATE TABLE IF NOT EXISTS public.content_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (type IN ('request', 'indication')),
      title TEXT,
      url TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'archived')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // RLS policies puladas: o banco Neon nao tem as funcoes Supabase (current_user_is_admin, auth.uid).
  // A authz neste repo e feita via JWT no app (requireRole). As policies ficam no DDL canonico
  // (supabase/schema.sql) para ambientes Supabase se necessario.

  await sql`
    CREATE INDEX IF NOT EXISTS idx_content_suggestions_status
      ON public.content_suggestions(status, created_at)
  `

  // Garantir que a funcao update_updated_at() exista (pode nao ter sido criada neste Neon DB)
  await sql`
    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `
  await sql`DROP TRIGGER IF EXISTS content_suggestions_updated_at ON public.content_suggestions`
  await sql`
    CREATE TRIGGER content_suggestions_updated_at
      BEFORE UPDATE ON public.content_suggestions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()
  `

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_suggestions'
    ORDER BY ordinal_position
  `
  console.log("Colunas content_suggestions:", cols.map((c) => c.column_name))
  console.log("Migration 022 aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
