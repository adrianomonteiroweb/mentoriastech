import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
config()

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS "study_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE cascade,
  "title" text,
  "role_type" text,
  "stack" text,
  "seniority" text,
  "languages" jsonb,
  "frameworks" jsonb,
  "strengths" text,
  "weaknesses" text,
  "experience" text,
  "minutes_per_day" integer DEFAULT 30 NOT NULL,
  "linked_opportunity_ids" jsonb,
  "plan_markdown" text,
  "progress" jsonb,
  "status" text DEFAULT 'active' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
)`

const CREATE_INDEX = `
CREATE INDEX IF NOT EXISTS "idx_study_plans_profile"
  ON "study_plans" USING btree ("profile_id","created_at")`

async function main() {
  await sql.query(CREATE_TABLE)
  await sql.query(CREATE_INDEX)
  const [{ count }] = (await sql.query(
    `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_name = 'study_plans'`,
  )) as { count: number }[]
  console.log(`study_plans table present: ${count === 1 ? "YES" : "NO"}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to apply study_plans:", err.message)
    process.exit(1)
  })
