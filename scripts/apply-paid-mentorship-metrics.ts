import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Adiciona as colunas de métricas (view_count, click_count) em paid_mentorships.
// Idempotente: ADD COLUMN IF NOT EXISTS. Operação rápida (metadata-only no Postgres).
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }
  const sql = neon(databaseUrl)

  console.log("Adicionando view_count/click_count em paid_mentorships...")
  await sql`ALTER TABLE public.paid_mentorships ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE public.paid_mentorships ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0`

  const cols: any = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'paid_mentorships'
      AND column_name IN ('view_count', 'click_count')
    ORDER BY column_name
  `
  console.log("Colunas presentes:", cols.map((c: any) => c.column_name).join(", "))
  console.log("OK.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
