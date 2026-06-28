import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
config()

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)

// Tabelas criadas em ordem de dependência. Tudo idempotente (IF NOT EXISTS).
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "learning_tracks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "slug" text NOT NULL UNIQUE,
    "description" text,
    "cover_image_url" text,
    "supports_english" boolean DEFAULT false NOT NULL,
    "english_paid_mentorship_id" uuid REFERENCES "public"."paid_mentorships"("id") ON DELETE set null,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" uuid REFERENCES "public"."profiles"("id") ON DELETE set null,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "learning_track_phases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "track_id" uuid NOT NULL REFERENCES "public"."learning_tracks"("id") ON DELETE cascade,
    "phase_key" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_optional" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS "idx_learning_track_phases_track"
    ON "learning_track_phases" USING btree ("track_id","sort_order")`,

  `CREATE TABLE IF NOT EXISTS "track_phase_content" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "phase_id" uuid NOT NULL REFERENCES "public"."learning_track_phases"("id") ON DELETE cascade,
    "content_id" uuid NOT NULL REFERENCES "public"."content_items"("id") ON DELETE cascade,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_track_phase_content_unique"
    ON "track_phase_content" USING btree ("phase_id","content_id")`,

  `CREATE TABLE IF NOT EXISTS "track_enrollments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "track_id" uuid REFERENCES "public"."learning_tracks"("id") ON DELETE set null,
    "mentee_id" uuid REFERENCES "public"."profiles"("id") ON DELETE set null,
    "guest_name" text,
    "guest_email" text,
    "guest_whatsapp" text,
    "target_international" boolean DEFAULT false NOT NULL,
    "include_english" boolean DEFAULT false NOT NULL,
    "english_interviews" boolean DEFAULT false NOT NULL,
    "requested_slot_id" uuid REFERENCES "public"."mentoring_slots"("id") ON DELETE set null,
    "requested_session_date" date,
    "requested_start_time" time,
    "requested_topic_id" uuid REFERENCES "public"."mentoring_topics"("id") ON DELETE set null,
    "status" text DEFAULT 'pending' NOT NULL,
    "notes" text,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS "idx_track_enrollments_mentee"
    ON "track_enrollments" USING btree ("mentee_id","created_at")`,

  `CREATE TABLE IF NOT EXISTS "track_enrollment_phases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "enrollment_id" uuid NOT NULL REFERENCES "public"."track_enrollments"("id") ON DELETE cascade,
    "phase_key" text NOT NULL,
    "title" text NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" text DEFAULT 'locked' NOT NULL,
    "booking_id" uuid REFERENCES "public"."bookings"("id") ON DELETE set null,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS "idx_track_enrollment_phases_enrollment"
    ON "track_enrollment_phases" USING btree ("enrollment_id","sort_order")`,

  `ALTER TABLE "bookings"
    ADD COLUMN IF NOT EXISTS "track_enrollment_phase_id" uuid
    REFERENCES "public"."track_enrollment_phases"("id") ON DELETE set null`,
]

async function main() {
  for (const statement of STATEMENTS) {
    await sql.query(statement)
  }

  const tables = [
    "learning_tracks",
    "learning_track_phases",
    "track_phase_content",
    "track_enrollments",
    "track_enrollment_phases",
  ]
  for (const table of tables) {
    const [{ count }] = (await sql.query(
      `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_name = $1`,
      [table],
    )) as { count: number }[]
    console.log(`${table} present: ${count === 1 ? "YES" : "NO"}`)
  }

  const [{ count: colCount }] = (await sql.query(
    `SELECT count(*)::int AS count FROM information_schema.columns
     WHERE table_name = 'bookings' AND column_name = 'track_enrollment_phase_id'`,
  )) as { count: number }[]
  console.log(`bookings.track_enrollment_phase_id present: ${colCount === 1 ? "YES" : "NO"}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to apply trilhas:", err.message)
    process.exit(1)
  })
