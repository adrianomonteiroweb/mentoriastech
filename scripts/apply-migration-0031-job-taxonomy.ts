import { config } from "dotenv"
config({ path: ".env.local" })
import { readFileSync } from "fs"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"
import { canonicalStacks } from "../lib/job-stacks"

// Aplica drizzle/manual/job_taxonomy.sql (job_companies, job_company_aliases,
// stacks, job_stacks, colunas de localidade em jobs, indices e a view
// job_company_stacks) e semeia o catalogo canonico de stacks.
//
// Idempotente: pode rodar mais de uma vez.
//
// NAO use `pnpm db:generate` para isto — o journal do drizzle-kit esta
// dessincronizado com o Neon neste projeto (ver drizzle/manual/*.sql).

const SQL_FILE = resolve(process.cwd(), "drizzle", "manual", "job_taxonomy.sql")

/**
 * Quebra o arquivo nos `--> statement-breakpoint` (convencao do drizzle).
 * Necessario porque o driver HTTP do Neon aceita um statement por request e os
 * blocos `DO $$ ... $$` tem ponto-e-virgula dentro — split por ";" quebraria.
 */
function readStatements(): string[] {
  return readFileSync(SQL_FILE, "utf8")
    .split("--> statement-breakpoint")
    .map((chunk) => chunk.trim())
    .filter((chunk) => {
      if (!chunk) return false
      // Descarta blocos que so tem comentario (o cabecalho do arquivo).
      const withoutComments = chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
      return withoutComments.length > 0
    })
    .map((chunk) => chunk.replace(/;\s*$/, ""))
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Aplicando migration 0031 (taxonomia de vagas)...")

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

  // Seed do catalogo canonico. Stacks que chegarem do bot e nao existirem aqui
  // sao criadas no proprio ingest — o seed so garante o label bonito.
  const catalog = canonicalStacks()
  const seeded = await sql.query(
    `INSERT INTO stacks (key, label, category)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
     ON CONFLICT (key) DO UPDATE
       SET label = excluded.label,
           category = excluded.category,
           updated_at = now()
     RETURNING key`,
    [
      catalog.map((s) => s.key),
      catalog.map((s) => s.label),
      catalog.map((s) => s.category),
    ],
  )
  console.log(`  catalogo de stacks: ${seeded.length}/${catalog.length} chaves`)

  // Verificacao final: as colunas e tabelas precisam existir de fato.
  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name IN ('company_id', 'city', 'city_key', 'region', 'country_name', 'country_code')
    ORDER BY column_name
  `
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('job_companies', 'job_company_aliases', 'stacks', 'job_stacks', 'job_company_stacks')
    ORDER BY table_name
  `

  console.log("Colunas em jobs:", columns.map((c) => c.column_name).join(", "))
  console.log("Tabelas/views:", tables.map((t) => t.table_name).join(", "))

  if (columns.length !== 6 || tables.length !== 5) {
    console.error("Migration 0031 INCOMPLETA — confira os erros acima.")
    process.exit(1)
  }

  console.log("Migration 0031 aplicada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
