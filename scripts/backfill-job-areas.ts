import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { neon } from "@neondatabase/serverless"
import {
  getAreaFamilyLabel,
  getAreaSpecialtyLabel,
  inferInclusionTags,
  inferJobArea,
  inferJobLevel,
} from "../lib/job-areas"
import type { JobLevelKey } from "../lib/job-areas"

// -----------------------------------------------------------------------------
// Backfill das areas de atuacao.
//
// Classifica em familia > especialidade as vagas que ja estavam no banco antes
// da migration job_areas, deriva o eixo de inclusao e corrige a senioridade que
// o bot deixou no default. Sem isto as colunas ficam NULL e o portal mostra
// tudo como "Outros".
//
// Tambem serve de RECONCILIADOR: cada fase filtra por "ainda nao preenchido",
// entao rodar de novo e barato e reclassifica o que ficou de fora quando o
// catalogo de lib/job-areas.ts cresce. Vale agendar semanalmente, junto com
// db:backfill:job-taxonomy.
//
// SOBRE NIVEL — a fase `level` so mexe onde `level_inferred` ainda e false E o
// valor atual e o default 'junior' do bot. Nivel digitado por uma pessoa (HR,
// admin) ou mandado explicitamente pelo bot NUNCA e sobrescrito: a inferencia e
// uma rede de seguranca, nao uma autoridade.
//
// Uso:
//   pnpm db:backfill:job-areas -- --dry-run
//   pnpm db:backfill:job-areas
//   pnpm db:backfill:job-areas -- --only=areas --batch=500
//   pnpm db:backfill:job-areas -- --force   (reclassifica TUDO, nao so o vazio)
// -----------------------------------------------------------------------------

type Phase = "areas" | "inclusion" | "level" | "likes"

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const FORCE = args.includes("--force")
const BATCH = Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] || 500)
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

type JobRow = {
  id: string
  title: string | null
  stack_tags: string[] | null
  category: string | null
  recommendation_note: string | null
  level: string | null
}

// ---------------------------------------------------------------------------
// Fase 0 — guarda. Falhar aqui e muito melhor que escrever pela metade.
// ---------------------------------------------------------------------------
async function assertSchema() {
  const expected = [
    "area_family",
    "area_source",
    "area_specialty",
    "inclusion_tags",
    "level_inferred",
    "like_count",
  ]

  const columns = (await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = ANY(${expected})
  `) as { column_name: string }[]

  const found = columns.map((c) => c.column_name)
  const missing = expected.filter((c) => !found.includes(c))

  if (missing.length > 0) {
    console.error(
      `Schema incompleto (faltando: ${missing.join(", ")}). ` +
        "Rode `pnpm db:apply:job-areas` antes.",
    )
    process.exit(1)
  }
}

async function fetchJobs(where: string): Promise<JobRow[]> {
  const limit = LIMIT > 0 ? `LIMIT ${LIMIT}` : ""
  return (await sql.query(
    `SELECT id, title, stack_tags, category, recommendation_note, level
     FROM jobs WHERE ${where} ORDER BY created_at DESC ${limit}`,
  )) as JobRow[]
}

/**
 * Escreve em lotes com `unnest`: um round trip por lote em vez de um por vaga.
 * Com a base inteira a classificar, a diferenca e entre minutos e horas — o
 * driver neon-http paga HTTPS a cada request.
 */
async function writeBatches<T>(
  rows: T[],
  apply: (batch: T[]) => Promise<void>,
  label: string,
) {
  if (DRY_RUN) {
    log(`  [dry-run] ${rows.length} vagas seriam atualizadas (${label})`)
    return
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await apply(batch)
    log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} (${label})`)
  }
}

// ---------------------------------------------------------------------------
// Fase 1 — area (familia > especialidade > origem)
// ---------------------------------------------------------------------------
async function backfillAreas() {
  log("\n[areas] classificando familia e especialidade...")

  const rows = await fetchJobs(FORCE ? "TRUE" : "area_family IS NULL")
  log(`  ${rows.length} vagas a classificar`)
  if (rows.length === 0) return

  const updates = rows.map((row) => {
    const area = inferJobArea({
      title: row.title,
      stackTags: row.stack_tags,
      legacyCategory: row.category,
    })
    return { id: row.id, ...area }
  })

  // Distribuicao antes de escrever: e a unica chance de ver que o catalogo
  // ficou enviesado (tudo em "outros", por exemplo) ANTES de gravar.
  const porFamilia = new Map<string, number>()
  const porOrigem = new Map<string, number>()
  for (const u of updates) {
    porFamilia.set(u.family, (porFamilia.get(u.family) ?? 0) + 1)
    porOrigem.set(u.source, (porOrigem.get(u.source) ?? 0) + 1)
  }

  log("  distribuicao por familia:")
  for (const [key, count] of Array.from(porFamilia).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((count / updates.length) * 100)
    log(`    ${getAreaFamilyLabel(key).padEnd(28)} ${String(count).padStart(6)}  ${pct}%`)
  }
  log("  origem da classificacao:")
  for (const [key, count] of Array.from(porOrigem).sort((a, b) => b[1] - a[1])) {
    log(`    ${key.padEnd(28)} ${String(count).padStart(6)}`)
  }

  const fallback = porFamilia.get("outros") ?? 0
  const pctFallback = Math.round((fallback / updates.length) * 100)
  if (pctFallback > 25) {
    log(
      `  AVISO: ${pctFallback}% caiu em "outros". Acima de ~25% vale revisar o\n` +
        "         catalogo de lib/job-areas.ts antes de gravar.",
    )
  }

  await writeBatches(
    updates,
    async (batch) => {
      await sql.query(
        `UPDATE jobs j SET
           area_family    = v.family,
           area_specialty = nullif(v.specialty, ''),
           area_source    = v.source,
           updated_at     = now()
         FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[])
           AS v(id, family, specialty, source)
         WHERE j.id = v.id`,
        [
          batch.map((u) => u.id),
          batch.map((u) => u.family),
          batch.map((u) => u.specialty ?? ""),
          batch.map((u) => u.source),
        ],
      )
    },
    "areas",
  )
}

// ---------------------------------------------------------------------------
// Fase 2 — eixo de inclusao
// ---------------------------------------------------------------------------
async function backfillInclusion() {
  log("\n[inclusion] derivando o eixo de inclusao...")

  const rows = await fetchJobs(
    FORCE ? "TRUE" : "inclusion_tags = '{}'::text[]",
  )
  log(`  ${rows.length} vagas a avaliar`)
  if (rows.length === 0) return

  const updates = rows
    .map((row) => ({
      id: row.id,
      tags: inferInclusionTags({
        title: row.title,
        legacyCategory: row.category,
        recommendationNote: row.recommendation_note,
      }),
    }))
    .filter((u) => u.tags.length > 0)

  log(`  ${updates.length} vagas com alguma flag de inclusao`)
  if (updates.length === 0) return

  const porTag = new Map<string, number>()
  for (const u of updates) {
    for (const tag of u.tags) porTag.set(tag, (porTag.get(tag) ?? 0) + 1)
  }
  for (const [key, count] of Array.from(porTag).sort((a, b) => b[1] - a[1])) {
    log(`    ${key.padEnd(28)} ${String(count).padStart(6)}`)
  }

  await writeBatches(
    updates,
    async (batch) => {
      // Serializa como texto separado por virgula e reabre com string_to_array:
      // unnest nao aceita array de array, e esta e a forma mais simples de
      // mandar N listas num lote so.
      await sql.query(
        `UPDATE jobs j SET
           inclusion_tags = string_to_array(v.tags, ','),
           updated_at     = now()
         FROM unnest($1::uuid[], $2::text[]) AS v(id, tags)
         WHERE j.id = v.id`,
        [batch.map((u) => u.id), batch.map((u) => u.tags.join(","))],
      )
    },
    "inclusion",
  )
}

// ---------------------------------------------------------------------------
// Fase 3 — senioridade
//
// So onde o bot deixou o default. Nivel posto por uma pessoa nao se toca.
// ---------------------------------------------------------------------------
async function backfillLevels() {
  log("\n[level] corrigindo a senioridade que ficou no default do bot...")

  const rows = await fetchJobs(
    FORCE ? "TRUE" : "level_inferred = false AND level = 'junior'",
  )
  log(`  ${rows.length} vagas candidatas`)
  if (rows.length === 0) return

  const updates = rows
    .map((row) => {
      const area = inferJobArea({
        title: row.title,
        stackTags: row.stack_tags,
        legacyCategory: row.category,
      })
      return { id: row.id, level: inferJobLevel(row.title, area.specialty) }
    })
    // `null` = o titulo nao diz a senioridade. Preserva o que esta no banco em
    // vez de trocar um palpite por outro.
    .filter((u): u is { id: string; level: JobLevelKey } => !!u.level && u.level !== "junior")

  log(`  ${updates.length} vagas com senioridade legivel no titulo`)
  if (updates.length === 0) return

  const porNivel = new Map<string, number>()
  for (const u of updates) porNivel.set(u.level, (porNivel.get(u.level) ?? 0) + 1)
  for (const [key, count] of Array.from(porNivel).sort((a, b) => b[1] - a[1])) {
    log(`    ${key.padEnd(28)} ${String(count).padStart(6)}`)
  }

  await writeBatches(
    updates,
    async (batch) => {
      await sql.query(
        `UPDATE jobs j SET
           level          = v.level,
           level_inferred = true,
           updated_at     = now()
         FROM unnest($1::uuid[], $2::text[]) AS v(id, level)
         WHERE j.id = v.id`,
        [batch.map((u) => u.id), batch.map((u) => u.level)],
      )
    },
    "level",
  )
}

// ---------------------------------------------------------------------------
// Fase 4 — reconciliacao de like_count
// ---------------------------------------------------------------------------
async function backfillLikes() {
  log("\n[likes] reconciliando like_count com job_actions...")

  if (DRY_RUN) {
    const [{ divergentes }] = (await sql`
      SELECT count(*)::int AS divergentes FROM jobs j
      LEFT JOIN (
        SELECT job_id, count(*)::int AS cnt FROM job_actions
        WHERE action_type = 'liked' GROUP BY job_id
      ) a ON a.job_id = j.id
      WHERE j.like_count IS DISTINCT FROM COALESCE(a.cnt, 0)
    `) as { divergentes: number }[]
    log(`  [dry-run] ${divergentes} vagas com contagem divergente`)
    return
  }

  const result = await sql`
    UPDATE jobs j SET like_count = COALESCE(a.cnt, 0)
    FROM (SELECT id FROM jobs) ids
    LEFT JOIN (
      SELECT job_id, count(*)::int AS cnt FROM job_actions
      WHERE action_type = 'liked' GROUP BY job_id
    ) a ON a.job_id = ids.id
    WHERE j.id = ids.id AND j.like_count IS DISTINCT FROM COALESCE(a.cnt, 0)
    RETURNING j.id
  `
  log(`  ${result.length} contagens corrigidas`)
}

// ---------------------------------------------------------------------------

async function main() {
  log("Backfill de areas de vagas")
  log(
    `  modo: ${DRY_RUN ? "DRY-RUN (nada e escrito)" : "ESCRITA"}` +
      `${FORCE ? " | --force: reclassifica TUDO" : ""}` +
      ` | lote: ${BATCH}${LIMIT ? ` | limite: ${LIMIT}` : ""}`,
  )

  await assertSchema()

  if (shouldRun("areas")) await backfillAreas()
  if (shouldRun("inclusion")) await backfillInclusion()
  if (shouldRun("level")) await backfillLevels()
  if (shouldRun("likes")) await backfillLikes()

  const [resumo] = (await sql`
    SELECT
      count(*)::int                                            AS total,
      count(area_family)::int                                  AS com_area,
      count(*) FILTER (WHERE area_family = 'outros')::int      AS em_outros,
      count(*) FILTER (WHERE inclusion_tags <> '{}')::int      AS com_inclusao,
      count(*) FILTER (WHERE level_inferred)::int              AS nivel_inferido
    FROM jobs
  `) as {
    total: number
    com_area: number
    em_outros: number
    com_inclusao: number
    nivel_inferido: number
  }[]

  log("\nResumo da base:")
  log(`  vagas ................. ${resumo.total}`)
  log(`  com area .............. ${resumo.com_area}`)
  log(`  em "outros" ........... ${resumo.em_outros}`)
  log(`  com flag de inclusao .. ${resumo.com_inclusao}`)
  log(`  nivel inferido ........ ${resumo.nivel_inferido}`)

  if (!DRY_RUN) {
    log(
      "\nLembre de invalidar o cache do painel: revalidateTag('job-insights')\n" +
        "(ou aguarde os 30 min de revalidacao de lib/db/job-insights.ts).",
    )
  }
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
