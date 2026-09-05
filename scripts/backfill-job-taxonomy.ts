import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { neon } from "@neondatabase/serverless"
import { normalizeCompanyKey, resolveCompanyIdentity } from "../lib/job-companies"
import { canonicalStacks, canonicalizeStackTags } from "../lib/job-stacks"
import { normalizeCityKey, parseJobLocation } from "../lib/job-location"

// -----------------------------------------------------------------------------
// Backfill da taxonomia de vagas.
//
// Preenche job_companies / jobs.company_id, stacks / job_stacks e as colunas de
// localidade das vagas que ja estavam no banco antes da migration 0031. Sem
// isto o painel /jobs/insights so enxerga vaga nova e fica sem massa critica.
//
// Tambem serve de RECONCILIADOR: cada fase filtra por "ainda nao preenchido"
// (IS NULL / NOT EXISTS), entao rodar de novo e barato e conserta as divergencias
// que o ingest deixa passar (falha parcial, bulk-delete do admin, mudanca no
// normalizador). Vale agendar semanalmente.
//
// Uso:
//   pnpm db:backfill:job-taxonomy -- --dry-run
//   pnpm db:backfill:job-taxonomy
//   pnpm db:backfill:job-taxonomy -- --only=location --batch=500
// -----------------------------------------------------------------------------

type Phase = "companies" | "stacks" | "location"

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const BATCH = Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] || 200)
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || 0)
const ONLY = (args.find((a) => a.startsWith("--only="))?.split("=")[1] || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean) as Phase[]

function shouldRun(phase: Phase) {
  return ONLY.length === 0 || ONLY.includes(phase)
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao configurada.")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

function log(...parts: unknown[]) {
  console.log(...parts)
}

// ---------------------------------------------------------------------------
// Fase 0 — guarda
// ---------------------------------------------------------------------------
async function assertSchema() {
  const columns = (await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name IN ('company_id','city','city_key','region','country_name','country_code')
  `) as { column_name: string }[]

  const tables = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('job_companies','stacks','job_stacks')
  `) as { table_name: string }[]

  if (columns.length !== 6 || tables.length !== 3) {
    console.error(
      "Schema incompleto. Rode antes: pnpm db:apply:job-taxonomy " +
        "(drizzle/manual/job_taxonomy.sql).",
    )
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Fase 1 — catalogo canonico de stacks
// ---------------------------------------------------------------------------
async function seedStacks() {
  const catalog = canonicalStacks()
  if (DRY_RUN) {
    log(`  [dry-run] semearia ${catalog.length} stacks canonicas`)
    return
  }

  await sql.query(
    `INSERT INTO stacks (key, label, category)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
     ON CONFLICT (key) DO NOTHING`,
    [
      catalog.map((s) => s.key),
      catalog.map((s) => s.label),
      catalog.map((s) => s.category),
    ],
  )
  log(`  catalogo canonico garantido (${catalog.length} chaves)`)
}

// ---------------------------------------------------------------------------
// Fase 2 — empresas
// ---------------------------------------------------------------------------
async function backfillCompanies() {
  const rows = (await sql`
    SELECT company, count(*)::int AS total
    FROM jobs
    WHERE company IS NOT NULL AND btrim(company) <> ''
    GROUP BY company
    ORDER BY total DESC
  `) as { company: string; total: number }[]

  // Agrupa as grafias pela chave canonica. O nome de exibicao do grupo e a
  // grafia MAIS FREQUENTE (desempate: a mais curta, que costuma ser a forma
  // limpa — "Google" em vez de "Google Brasil Internet Ltda").
  const groups = new Map<string, { names: { name: string; total: number }[]; total: number }>()
  for (const row of rows) {
    const key = normalizeCompanyKey(row.company)
    if (!key) continue
    const group = groups.get(key) || { names: [], total: 0 }
    group.names.push({ name: row.company, total: row.total })
    group.total += row.total
    groups.set(key, group)
  }

  // RELATORIO DE COLISOES — portao de revisao humana. Leia isto no --dry-run
  // ANTES da primeira execucao real: depois que company_id e escrito, desfazer
  // uma fusao errada e trabalho manual.
  const collisions = [...groups.entries()].filter(([, g]) => g.names.length > 1)
  log(`  ${rows.length} grafias distintas -> ${groups.size} empresas`)
  if (collisions.length > 0) {
    log(`  ${collisions.length} grupos com mais de uma grafia (revise):`)
    for (const [key, group] of collisions
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 40)) {
      const names = group.names
        .sort((a, b) => b.total - a.total)
        .map((n) => `"${n.name}" (${n.total})`)
        .join(" + ")
      log(`    ${key}: ${names}`)
    }
    if (collisions.length > 40) log(`    ... e mais ${collisions.length - 40} grupos`)
  }

  if (DRY_RUN) {
    log("  [dry-run] nenhuma escrita")
    return
  }

  let created = 0
  let linked = 0

  for (const [key, group] of groups) {
    const sorted = [...group.names].sort(
      (a, b) => b.total - a.total || a.name.length - b.name.length,
    )
    const identity = resolveCompanyIdentity(sorted[0].name, null)
    if (!identity) continue

    const inserted = (await sql.query(
      `INSERT INTO job_companies (name, slug)
       VALUES ($1, $2)
       ON CONFLICT ("slug") DO UPDATE SET last_seen_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [identity.name, key],
    )) as { id: string; inserted: boolean }[]

    const companyId = inserted[0]?.id
    if (!companyId) continue
    if (inserted[0]?.inserted) created += 1

    // Uma unica UPDATE por grupo, cobrindo todas as grafias — sem round trip
    // por linha.
    const updated = (await sql.query(
      `UPDATE jobs SET company_id = $1
       WHERE company_id IS NULL AND company = ANY($2::text[])
       RETURNING id`,
      [companyId, group.names.map((n) => n.name)],
    )) as { id: string }[]

    linked += updated.length
  }

  log(`  empresas criadas: ${created} | vagas vinculadas: ${linked}`)
}

// ---------------------------------------------------------------------------
// Fase 3 — stacks
// ---------------------------------------------------------------------------
async function backfillStacks() {
  let processed = 0
  let links = 0

  for (;;) {
    if (LIMIT && processed >= LIMIT) break
    const take = LIMIT ? Math.min(BATCH, LIMIT - processed) : BATCH

    const rows = (await sql.query(
      `SELECT id, stack_tags FROM jobs
       WHERE cardinality(stack_tags) > 0
         AND NOT EXISTS (SELECT 1 FROM job_stacks js WHERE js.job_id = jobs.id)
       ORDER BY created_at
       LIMIT $1`,
      [take],
    )) as { id: string; stack_tags: string[] }[]

    if (rows.length === 0) break

    // Achata para arrays paralelos: o lote inteiro vira UM statement.
    const jobIds: string[] = []
    const keys: string[] = []
    const labels: string[] = []
    const categories: string[] = []

    for (const row of rows) {
      for (const stack of canonicalizeStackTags(row.stack_tags)) {
        jobIds.push(row.id)
        keys.push(stack.key)
        labels.push(stack.label)
        categories.push(stack.category)
      }
    }

    processed += rows.length

    if (jobIds.length === 0) {
      // Lote inteiro so tinha tag inutil. Sem isto o loop nao termina, porque a
      // proxima pagina traria as mesmas linhas.
      log(`  aviso: ${rows.length} vagas sem nenhuma tag aproveitavel — pulando`)
      break
    }

    if (DRY_RUN) {
      log(`  [dry-run] ${rows.length} vagas -> ${jobIds.length} vinculos`)
      break
    }

    // Mesmo CTE do ingest (lib/db/job-taxonomy.ts), mas para um lote inteiro:
    // cria as stacks que faltam, resolve todos os ids e liga nas vagas.
    await sql.query(
      `WITH input(job_id, key, label, category) AS (
         SELECT * FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[])
       ),
       ins AS (
         INSERT INTO stacks (key, label, category)
         SELECT DISTINCT key, label, category FROM input
         ON CONFLICT ("key") DO NOTHING
         RETURNING id, key
       ),
       resolved AS (
         SELECT id, key FROM ins
         UNION ALL
         SELECT s.id, s.key FROM stacks s
         WHERE s.key IN (SELECT key FROM input)
           AND NOT EXISTS (SELECT 1 FROM ins WHERE ins.key = s.key)
       )
       INSERT INTO job_stacks (job_id, stack_id)
       SELECT DISTINCT i.job_id, r.id
       FROM input i JOIN resolved r ON r.key = i.key
       ON CONFLICT ("job_id", "stack_id") DO NOTHING`,
      [jobIds, keys, labels, categories],
    )

    links += jobIds.length
    log(`  ${processed} vagas processadas (${links} vinculos)`)
  }

  log(`  stacks: ${processed} vagas, ${links} vinculos`)
}

// ---------------------------------------------------------------------------
// Fase 4 — localidade
// ---------------------------------------------------------------------------
async function backfillLocation() {
  let processed = 0
  let resolved = 0
  const unparsed: string[] = []

  for (;;) {
    if (LIMIT && processed >= LIMIT) break
    const take = LIMIT ? Math.min(BATCH, LIMIT - processed) : BATCH

    const rows = (await sql.query(
      `SELECT id, location, is_international FROM jobs
       WHERE location IS NOT NULL AND btrim(location) <> ''
         AND city_key IS NULL AND country_code IS NULL
       ORDER BY created_at
       LIMIT $1 OFFSET $2`,
      [take, DRY_RUN ? processed : 0],
    )) as { id: string; location: string; is_international: boolean }[]

    if (rows.length === 0) break

    const ids: string[] = []
    const cities: (string | null)[] = []
    const cityKeys: (string | null)[] = []
    const regions: (string | null)[] = []
    const countryNames: (string | null)[] = []
    const countryCodes: (string | null)[] = []

    for (const row of rows) {
      const parsed = parseJobLocation(row.location, {
        isInternational: row.is_international,
      })

      if (!parsed.cityKey && !parsed.countryCode) {
        if (unparsed.length < 20) unparsed.push(row.location)
        continue
      }

      ids.push(row.id)
      cities.push(parsed.city)
      cityKeys.push(parsed.cityKey ?? normalizeCityKey(parsed.city))
      regions.push(parsed.region)
      countryNames.push(parsed.countryName)
      countryCodes.push(parsed.countryCode)
    }

    processed += rows.length
    resolved += ids.length

    if (DRY_RUN) {
      log(`  [dry-run] ${rows.length} vagas -> ${ids.length} resolvidas`)
      if (rows.length < take) break
      continue
    }

    if (ids.length === 0) {
      // Nenhuma linha do lote foi resolvida: a proxima pagina traria as mesmas.
      log(`  aviso: ${rows.length} vagas com localidade improcessavel — parando`)
      break
    }

    await sql.query(
      `UPDATE jobs j SET
         city = v.city,
         city_key = v.city_key,
         region = v.region,
         country_name = v.country_name,
         country_code = v.country_code
       FROM (
         SELECT * FROM unnest(
           $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[]
         ) AS t(id, city, city_key, region, country_name, country_code)
       ) v
       WHERE j.id = v.id`,
      [ids, cities, cityKeys, regions, countryNames, countryCodes],
    )

    log(`  ${processed} vagas processadas (${resolved} resolvidas)`)
  }

  log(`  localidade: ${processed} vagas, ${resolved} resolvidas`)

  // Esta amostra e o insumo direto para estender COUNTRY_CODES em
  // lib/job-location.ts. Se ela estiver cheia de paises reais, o dicionario
  // esta curto demais.
  if (unparsed.length > 0) {
    log(`  ${unparsed.length}+ localidades nao resolvidas — amostra:`)
    for (const value of unparsed) log(`    ${JSON.stringify(value.slice(0, 120))}`)
  }
}

// ---------------------------------------------------------------------------
// Relatorio de cobertura
// ---------------------------------------------------------------------------
async function coverage(label: string) {
  const [row] = (await sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE company_id IS NULL AND company IS NOT NULL)::int AS sem_empresa,
      count(*) FILTER (WHERE country_code IS NULL AND location IS NOT NULL)::int AS sem_pais,
      count(*) FILTER (
        WHERE cardinality(stack_tags) > 0
          AND NOT EXISTS (SELECT 1 FROM job_stacks js WHERE js.job_id = jobs.id)
      )::int AS sem_stacks
    FROM jobs
  `) as {
    total: number
    sem_empresa: number
    sem_pais: number
    sem_stacks: number
  }[]

  log(
    `${label}: ${row.total} vagas | sem empresa: ${row.sem_empresa} | ` +
      `sem pais: ${row.sem_pais} | sem stacks: ${row.sem_stacks}`,
  )
}

async function main() {
  log(
    `Backfill da taxonomia de vagas${DRY_RUN ? " [DRY RUN — nenhuma escrita]" : ""}` +
      `${ONLY.length ? ` (fases: ${ONLY.join(", ")})` : ""}`,
  )

  await assertSchema()
  await coverage("Antes ")

  if (shouldRun("stacks") || shouldRun("companies")) {
    log("\n> Catalogo de stacks")
    await seedStacks()
  }

  if (shouldRun("companies")) {
    log("\n> Empresas")
    await backfillCompanies()
  }

  if (shouldRun("stacks")) {
    log("\n> Stacks")
    await backfillStacks()
  }

  if (shouldRun("location")) {
    log("\n> Localidade")
    await backfillLocation()
  }

  log("")
  await coverage("Depois")

  if (DRY_RUN) {
    log("\nDry run — nada foi escrito. Revise o relatorio de colisoes acima e")
    log("ajuste LEGAL_SUFFIXES / REGION_SUFFIXES em lib/job-companies.ts e")
    log("COUNTRY_ENTRIES em lib/job-location.ts antes de rodar de verdade.")
  }
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
