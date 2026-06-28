import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Adiciona as colunas summary e important_note em jobs (vagas internacionais).
// Idempotente: pode rodar mais de uma vez.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Aplicando migration 0030 (jobs.summary, jobs.important_note)...")

  await sql`ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS summary TEXT`
  await sql`ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS important_note TEXT`

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name IN ('summary', 'important_note')
    ORDER BY column_name
  `
  console.log("Colunas presentes:", cols.map((c) => c.column_name))
  console.log("Migration 0030 aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
