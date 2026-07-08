import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

// Cria a tabela job_alert_subscriptions (inscrição de vagas por WhatsApp).
// Espelha drizzle/manual/job_alert_subscriptions.sql. Idempotente.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Criando tabela job_alert_subscriptions...")

  await sql`
    CREATE TABLE IF NOT EXISTS "job_alert_subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "profile_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
      "enabled" boolean DEFAULT true NOT NULL,
      "name" text,
      "whatsapp" text,
      "positions" text[] DEFAULT '{}' NOT NULL,
      "stack" text[] DEFAULT '{}' NOT NULL,
      "levels" text[] DEFAULT '{}' NOT NULL,
      "ignore_words" text[] DEFAULT '{}' NOT NULL,
      "is_international" boolean DEFAULT true NOT NULL,
      "daily_limit" integer DEFAULT 10 NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT "job_alert_subscriptions_daily_limit_range"
        CHECK ("daily_limit" BETWEEN 1 AND 50)
    )
  `

  const tbl = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'job_alert_subscriptions'
  `
  console.log("Tabela job_alert_subscriptions presente?", tbl.length > 0)
  console.log("Migration aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
