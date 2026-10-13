import { config } from "dotenv"
config({ path: ".env.local" })
import { readFileSync } from "fs"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"

// Aplica drizzle/manual/job_areas.sql: colunas de area (familia/especialidade/
// origem), eixo de inclusao, flag de nivel inferido, like_count materializado,
// indices e a reconciliacao do CHECK de `level`.
//
// Idempotente: pode rodar mais de uma vez.
//
// NAO use `pnpm db:generate` para isto — o journal do drizzle-kit esta
// dessincronizado com o Neon neste projeto (ver drizzle/manual/*.sql).
//
// Depois desta migracao rode `pnpm db:backfill:job-areas` para classificar as
// vagas que ja estao no banco; sem o backfill as colunas ficam NULL e o portal
// mostra tudo como "Outros".

const SQL_FILE = resolve(process.cwd(), "drizzle", "manual", "job_areas.sql")

/**
 * Quebra nos `--> statement-breakpoint` (convencao do drizzle). Necessario
 * porque o driver HTTP do Neon aceita um statement por request e os blocos
 * `DO $$ ... $$` tem ponto-e-virgula dentro — split por ";" quebraria.
 */
function readStatements(): string[] {
  return readFileSync(SQL_FILE, "utf8")
    .split("--> statement-breakpoint")
    .map((chunk) => chunk.trim())
    .filter((chunk) => {
      if (!chunk) return false
      const withoutComments = chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
      return withoutComments.length > 0
    })
    .map((chunk) => chunk.replace(/;\s*$/, ""))
}

const EXPECTED_COLUMNS = [
  "area_family",
  "area_source",
  "area_specialty",
  "inclusion_tags",
  "level_inferred",
  "like_count",
]

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Aplicando migration job_areas (areas, inclusao, like_count)...")

  const statements = readStatements()
  console.log(`  ${statements.length} statements em ${SQL_FILE}`)

  for (const [index, statement] of statements.entries()) {
    const label = statement.split("\n")[0].slice(0, 70)
    try {
      await sql.query(statement)
      console.log(`  [${index + 1}/${statements.length}] ok   ${label}`)
    } catch (err) {
      console.error(`  [${index + 1}/${statements.length}] FALHOU ${label}`)
      throw err
    }
  }

  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = ANY(${EXPECTED_COLUMNS})
    ORDER BY column_name
  `

  const found = columns.map((c) => c.column_name as string)
  console.log("Colunas em jobs:", found.join(", "))

  const missing = EXPECTED_COLUMNS.filter((c) => !found.includes(c))
  if (missing.length > 0) {
    console.error("Migration INCOMPLETA — faltando:", missing.join(", "))
    process.exit(1)
  }

  // O CHECK antigo de `level` so conhecia 4 niveis enquanto o codigo ja usava 8
  // (ver o comentario no .sql). Confirma que a reconciliacao pegou.
  const levelCheck = await sql`
    SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
    WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_level_check'
  `
  const def = (levelCheck[0]?.def as string | undefined) ?? ""
  if (def && !def.includes("senior_staff")) {
    console.error("ATENCAO: jobs_level_check ainda nao aceita os 8 niveis:", def)
    process.exit(1)
  }
  console.log("CHECK de level:", def ? "8 niveis ok" : "sem CHECK (ok)")

  const [{ total, classificadas }] = (await sql`
    SELECT count(*)::int AS total,
           count(area_family)::int AS classificadas
    FROM jobs
  `) as { total: number; classificadas: number }[]

  console.log(`Vagas: ${classificadas}/${total} ja com area.`)
  if (classificadas < total) {
    console.log("Proximo passo: pnpm db:backfill:job-areas --dry-run")
  }

  console.log("Migration job_areas aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
