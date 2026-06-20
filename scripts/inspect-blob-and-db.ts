import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { neon } from "@neondatabase/serverless"
import { list } from "@vercel/blob"

// Inspeção READ-ONLY: estado do banco (.env.local) e dos dois blob stores.
// Não altera nada. Usado antes da migração de blob store.
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL nao configurada")
  const oldToken = process.env.OLD_BLOB_READ_WRITE_TOKEN
  const newToken = process.env.BLOB_READ_WRITE_TOKEN

  console.log("== Ambiente ==")
  console.log("DB host:", new URL(databaseUrl).host)
  console.log("OLD_BLOB_READ_WRITE_TOKEN presente:", !!oldToken)
  console.log("BLOB_READ_WRITE_TOKEN presente:", !!newToken)

  const sql = neon(databaseUrl)

  console.log("\n== Tabelas (booking) ==")
  const tables = ["booking_attachments", "booking_tasks", "booking_task_items"]
  for (const t of tables) {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${t}
      ORDER BY ordinal_position`
    console.log(`- ${t}: ${cols.length ? "EXISTE" : "FALTANDO"}`)
    if (cols.length) console.log("    colunas:", cols.map((c: any) => c.column_name).join(", "))
  }

  console.log("\n== Migrations drizzle aplicadas ==")
  try {
    const applied: any = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`
    console.log(`Total aplicadas: ${applied.length}`)
  } catch (e) {
    console.log("drizzle.__drizzle_migrations nao encontrada:", (e as Error).message)
  }

  console.log("\n== Verificacao de tabelas (schema.ts vs banco) ==")
  const expected = [
    "profiles", "user_roles", "mentoring_slots", "mentoring_topics", "paid_mentorships",
    "bookings", "booking_history_sync_queue", "booking_attachments", "booking_tasks",
    "booking_task_items", "payments", "content_categories", "content_items", "jobs",
    "site_settings", "site_private_settings", "page_shares", "audit_logs",
    "mentee_access_codes", "mentee_access_sessions", "content_views", "ads", "tips",
    "job_actions", "content_suggestions", "companies", "opportunity_resumes",
    "opportunities", "opportunity_events", "study_plans", "message_templates",
    "selection_processes", "selection_process_candidates", "selection_process_share_links",
  ]
  const rows: any = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'`
  const present = new Set(rows.map((r: any) => r.table_name))
  const missing = expected.filter((t) => !present.has(t))
  console.log(`Esperadas: ${expected.length} | Presentes: ${expected.length - missing.length}`)
  console.log(missing.length ? `FALTANDO: ${missing.join(", ")}` : "Todas as tabelas do schema.ts existem.")

  async function countStore(token: string) {
    let count = 0
    let host = ""
    let sample = ""
    let cursor: string | undefined
    do {
      const r = await list({ token, cursor, limit: 1000 })
      count += r.blobs.length
      if (!host && r.blobs[0]) {
        host = new URL(r.blobs[0].url).host
        sample = r.blobs[0].pathname
      }
      cursor = r.hasMore ? r.cursor : undefined
    } while (cursor)
    return { count, host, sample }
  }

  console.log("\n== Blob stores ==")
  if (oldToken) {
    const o = await countStore(oldToken)
    console.log(`OLD: ${o.count} blobs | host=${o.host} | exemplo=${o.sample}`)
  } else {
    console.log("OLD: token ausente")
  }
  if (newToken) {
    const n = await countStore(newToken)
    console.log(`NEW: ${n.count} blobs | host=${n.host || "(vazio)"} | exemplo=${n.sample || "-"}`)
  } else {
    console.log("NEW: token ausente")
  }
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
