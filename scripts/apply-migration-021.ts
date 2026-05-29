import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Aplica a migration 021 (indicacao de vagas + curtidas) no banco do .env.local.
// Idempotente: pode rodar mais de uma vez sem efeito colateral.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Aplicando migration 021...")

  await sql`ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recommendation_note TEXT`
  await sql`ALTER TABLE public.jobs ALTER COLUMN company DROP NOT NULL`
  await sql`ALTER TABLE public.jobs ALTER COLUMN description DROP NOT NULL`
  await sql`CREATE INDEX IF NOT EXISTS idx_job_actions_type_job ON public.job_actions(action_type, job_id)`

  const cols = await sql`
    SELECT column_name, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name IN ('recommendation_note', 'company', 'description')
    ORDER BY column_name
  `
  const idx = await sql`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_job_actions_type_job'
  `

  console.log("Colunas:", cols)
  console.log("Indice:", idx)
  console.log("Migration 021 aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
