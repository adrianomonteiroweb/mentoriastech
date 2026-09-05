import { unstable_cache } from "next/cache"
import { sql, type SQL } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { getJobCategoryLabel } from "@/lib/job-options"
import { getStackLabel } from "@/lib/job-stacks"
import { COUNTRY_NAME_BY_CODE } from "@/lib/job-location"

// -----------------------------------------------------------------------------
// Agregacoes do painel publico de indicadores de vagas (/jobs/insights).
//
// Sobre transacao: o driver neon-http nao tem transacao interativa, mas
// `db.batch` embrulha os statements numa transacao do Neon. As nove agregacoes
// vao num batch SO — um round trip e, mais importante, UM SNAPSHOT: sem isso
// cada painel leria um estado diferente do banco e os percentuais nao fechariam
// entre si.
//
// Sobre fuso: usamos o nome 'America/Sao_Paulo' dentro do Postgres, e nao o
// SP_OFFSET_MS fixo de app/api/admin/stats/route.ts. Aquele offset manual existe
// porque la as fronteiras sao montadas em JS; aqui o bucketing ja acontece no
// banco, entao o fuso nomeado e mais curto e imune a horario de verao.
// -----------------------------------------------------------------------------

const TIMEZONE = "America/Sao_Paulo"

export const JOB_LEVEL_ORDER = [
  "internship",
  "junior",
  "mid",
  "senior",
  "staff",
  "senior_staff",
  "principal",
  "distinguished",
] as const

export const JOB_LEVEL_LABELS: Record<string, string> = {
  internship: "Estágio",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  staff: "Staff",
  senior_staff: "Senior Staff",
  principal: "Principal",
  distinguished: "Distinguished",
}

export const WORK_MODEL_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
}

export const insightsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
  // `created_at` = quando a plataforma ingeriu: monotonico, nunca retroagido,
  // entao a comparacao periodo-a-periodo e honesta. `source_posted_at` deriva
  // do active_hours do bot e responde "quando o mercado publicou" — util, mas
  // nao serve de default.
  date_field: z.enum(["created_at", "source_posted_at"]).default("created_at"),
  stack: z.string().max(60).optional(),
  country: z.string().length(2).optional(),
  level: z.enum(JOB_LEVEL_ORDER).optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).optional(),
  category: z.string().max(60).optional(),
  international: z.enum(["true", "false"]).optional(),
})

export type InsightsQuery = z.infer<typeof insightsQuerySchema>

const PERIOD_DAYS: Record<InsightsQuery["period"], number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
  all: null,
}

function bucketFor(period: InsightsQuery["period"]) {
  if (period === "7d" || period === "30d") return { unit: "day", interval: "1 day" }
  if (period === "90d") return { unit: "week", interval: "1 week" }
  return { unit: "month", interval: "1 month" }
}

export type PeriodRange = {
  from: Date
  to: Date
  previousFrom: Date
  bucket: string
  interval: string
}

/** Janela atual + a janela imediatamente anterior de mesmo tamanho. */
export function resolvePeriod(period: InsightsQuery["period"]): PeriodRange {
  const to = new Date()
  const days = PERIOD_DAYS[period]
  const { unit, interval } = bucketFor(period)

  // "all": janela desde 2020, grande o bastante para cobrir a base inteira. O
  // periodo anterior fica vazio e os deltas saem null — que e o correto: nao ha
  // com o que comparar.
  const from = days
    ? new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    : new Date("2020-01-01T00:00:00.000Z")

  const previousFrom = days
    ? new Date(from.getTime() - days * 24 * 60 * 60 * 1000)
    : from

  return { from, to, previousFrom, bucket: unit, interval }
}

/**
 * Fragmento `where` compartilhado por todas as agregacoes.
 *
 * `status = 'approved'` e FIXO: este modulo alimenta a pagina PUBLICA, e vaga
 * pendente/rejeitada nao pode vazar nem como numero agregado.
 */
export function buildJobFilter(
  query: InsightsQuery,
  range: PeriodRange,
  options: { includePrevious?: boolean } = {},
): SQL {
  const start = options.includePrevious ? range.previousFrom : range.from
  // sql.raw e seguro AQUI e so aqui porque o zod estreitou date_field para dois
  // literais. Nao replique este padrao com valor livre.
  const dateColumn = sql.raw(`j.${query.date_field}`)

  const parts: SQL[] = [
    sql`j.status = 'approved'`,
    sql`${dateColumn} >= ${start.toISOString()}::timestamptz`,
    sql`${dateColumn} < ${range.to.toISOString()}::timestamptz`,
  ]

  if (query.international !== undefined) {
    parts.push(sql`j.is_international = ${query.international === "true"}`)
  }
  if (query.level) parts.push(sql`j.level = ${query.level}`)
  if (query.job_type) parts.push(sql`j.job_type = ${query.job_type}`)
  if (query.category) parts.push(sql`j.category = ${query.category}`)
  if (query.country) parts.push(sql`j.country_code = ${query.country.toUpperCase()}`)
  if (query.stack) {
    parts.push(sql`exists (
      select 1 from job_stacks js0
      join stacks s0 on s0.id = js0.stack_id
      where js0.job_id = j.id and s0.key = ${query.stack}
    )`)
  }

  return sql.join(parts, sql` and `)
}

// ---------------------------------------------------------------------------
// Tipos da resposta
// ---------------------------------------------------------------------------

export type InsightsKpi = {
  current: number
  previous: number
  /** null quando o periodo anterior foi zero — nao ha crescimento definivel. */
  delta_pct: number | null
}

export type InsightsCount = {
  key: string
  label: string
  count: number
  share_pct: number
}

export type InsightsLocation = {
  key: string
  label: string
  region: string | null
  country_code: string | null
  count: number
  share_pct: number
}

export type InsightsCompany = {
  id: string
  name: string
  slug: string
  linkedin_url: string | null
  job_count: number
  stacks: { key: string; label: string }[]
  top_level: string | null
}

export type InsightsPoint = {
  date: string
  total: number
  international: number
}

export type JobInsights = {
  period: {
    preset: string
    date_field: string
    bucket: string
    timezone: string
    from: string
    to: string
    previous_from: string
  }
  filters: Record<string, string | null>
  kpis: {
    total_jobs: InsightsKpi
    companies: InsightsKpi
    remote: InsightsKpi & { share_pct: number }
    international: InsightsKpi & { share_pct: number }
    top_stack: { key: string; label: string; count: number } | null
  }
  top_stacks: InsightsCount[]
  /** ATENÇÃO: share_pct aqui é sobre MENÇÕES, não sobre vagas — uma vaga tem
   *  várias stacks, então a soma passa de 100%. A UI precisa dizer isso. */
  stack_mentions_total: number
  work_model: InsightsCount[]
  levels: InsightsCount[]
  categories: InsightsCount[]
  top_countries: InsightsLocation[]
  top_cities: InsightsLocation[]
  top_companies: InsightsCompany[]
  time_series: InsightsPoint[]
  generated_at: string
}

function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function sharePct(count: number, total: number): number {
  if (!total) return 0
  return Math.round((count / total) * 1000) / 10
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

export const JOB_INSIGHTS_CACHE_TAG = "job-insights"
const JOB_INSIGHTS_CACHE_SECONDS = 1800

/**
 * getJobInsights — versao cacheada, que e a que a pagina e a API devem usar.
 *
 * Por que o cache e obrigatorio aqui: a pagina /jobs/insights le `searchParams`,
 * o que a torna DINAMICA no App Router — o `export const revalidate` da pagina
 * nao impede que cada visita chegue no banco. Sendo publica, isso significaria
 * nove queries agregadas por visitante. O cache e por combinacao de filtros
 * (a chave inclui a query serializada), entao o recorte padrao — que e o que a
 * esmagadora maioria abre — custa uma ida ao banco a cada 30 minutos.
 *
 * Invalidar manualmente (ex.: depois de um backfill) com
 * `revalidateTag(JOB_INSIGHTS_CACHE_TAG)`.
 */
export function getJobInsights(query: InsightsQuery): Promise<JobInsights> {
  const key = JSON.stringify([
    query.period,
    query.date_field,
    query.stack ?? "",
    query.country ?? "",
    query.level ?? "",
    query.job_type ?? "",
    query.category ?? "",
    query.international ?? "",
  ])

  return unstable_cache(() => queryJobInsights(query), ["job-insights", key], {
    revalidate: JOB_INSIGHTS_CACHE_SECONDS,
    tags: [JOB_INSIGHTS_CACHE_TAG],
  })()
}

async function queryJobInsights(query: InsightsQuery): Promise<JobInsights> {
  const range = resolvePeriod(query.period)
  const filter = buildJobFilter(query, range)
  const filterWithPrevious = buildJobFilter(query, range, { includePrevious: true })
  const fromIso = range.from.toISOString()
  const dateColumn = sql.raw(`j.${query.date_field}`)

  // KPIs: janela atual e anterior no MESMO scan, via `filter (where ...)`.
  const kpisStmt = db.execute<{
    total_current: number
    total_previous: number
    companies_current: number
    companies_previous: number
    remote_current: number
    remote_previous: number
    international_current: number
    international_previous: number
  }>(sql`
    select
      count(*) filter (where ${dateColumn} >= ${fromIso}::timestamptz)::int as total_current,
      count(*) filter (where ${dateColumn} <  ${fromIso}::timestamptz)::int as total_previous,
      count(distinct j.company_id) filter (where ${dateColumn} >= ${fromIso}::timestamptz)::int as companies_current,
      count(distinct j.company_id) filter (where ${dateColumn} <  ${fromIso}::timestamptz)::int as companies_previous,
      count(*) filter (where ${dateColumn} >= ${fromIso}::timestamptz and j.job_type = 'remote')::int as remote_current,
      count(*) filter (where ${dateColumn} <  ${fromIso}::timestamptz and j.job_type = 'remote')::int as remote_previous,
      count(*) filter (where ${dateColumn} >= ${fromIso}::timestamptz and j.is_international)::int as international_current,
      count(*) filter (where ${dateColumn} <  ${fromIso}::timestamptz and j.is_international)::int as international_previous
    from jobs j
    where ${filterWithPrevious}
  `)

  // Join com job_stacks, NAO unnest(stack_tags): o unnest agruparia pela tag
  // crua e "node", "Node.js" e "nodejs" virariam tres barras no grafico.
  const stacksStmt = db.execute<{ key: string; count: number }>(sql`
    select s.key, count(*)::int as count
    from jobs j
    join job_stacks js on js.job_id = j.id
    join stacks s      on s.id = js.stack_id
    where ${filter}
    group by s.key
    order by count(*) desc, s.key asc
    limit 20
  `)

  const workModelStmt = db.execute<{ job_type: string; count: number }>(sql`
    select j.job_type, count(*)::int as count
    from jobs j where ${filter}
    group by j.job_type
    order by count(*) desc
  `)

  const levelsStmt = db.execute<{ level: string; count: number }>(sql`
    select j.level, count(*)::int as count
    from jobs j where ${filter}
    group by j.level
  `)

  const categoriesStmt = db.execute<{ category: string; count: number }>(sql`
    select j.category, count(*)::int as count
    from jobs j where ${filter}
    group by j.category
    order by count(*) desc
    limit 15
  `)

  // Nulos NAO sao filtrados: viram o balde "Não informado". Escondê-los faria
  // os percentuais dos outros baldes mentirem.
  const countriesStmt = db.execute<{
    country_code: string | null
    country: string | null
    count: number
  }>(sql`
    select
      j.country_code,
      mode() within group (order by j.country_name) as country,
      count(*)::int as count
    from jobs j where ${filter}
    group by j.country_code
    order by count(*) desc
    limit 15
  `)

  // Agrupado por city_key (e nao por `city`), senao "São Paulo" / "Sao Paulo"
  // viram baldes diferentes. `mode()` escolhe a grafia mais comum para exibir —
  // `min()` escolheria por ordem alfabetica, que e acidente.
  const citiesStmt = db.execute<{
    city_key: string | null
    city: string | null
    region: string | null
    country_code: string | null
    count: number
  }>(sql`
    select
      j.city_key,
      mode() within group (order by j.city)   as city,
      mode() within group (order by j.region) as region,
      j.country_code,
      count(*)::int as count
    from jobs j where ${filter}
    group by j.city_key, j.country_code
    order by count(*) desc
    limit 15
  `)

  // Lateral, e nao a view job_company_stacks: o painel respeita o periodo
  // escolhido; a view e historico completo (essa serve ao drawer da empresa).
  const companiesStmt = db.execute<{
    id: string
    name: string
    slug: string
    linkedin_url: string | null
    job_count: number
    top_level: string | null
    stacks: string[] | null
  }>(sql`
    with top as (
      select j.company_id,
             count(*)::int as job_count,
             mode() within group (order by j.level) as top_level
      from jobs j
      where ${filter} and j.company_id is not null
      group by j.company_id
      order by count(*) desc
      limit 12
    )
    select c.id, c.name, c.slug, c.linkedin_url, t.job_count, t.top_level,
           cs.stacks
    from top t
    join job_companies c on c.id = t.company_id
    left join lateral (
      select array_agg(x.key order by x.n desc) as stacks
      from (
        select s.key, count(*) as n
        from jobs j
        join job_stacks js on js.job_id = j.id
        join stacks s      on s.id = js.stack_id
        where ${filter} and j.company_id = t.company_id
        group by s.key
        order by count(*) desc
        limit 6
      ) x
    ) cs on true
    order by t.job_count desc
  `)

  // generate_series + left join: a serie sai SEM buraco. Um dia faltando no
  // eixo lê como "nao houve vaga", quando na verdade e ausencia de linha.
  const seriesStmt = db.execute<{
    date: string
    total: number
    international: number
  }>(sql`
    with buckets as (
      select generate_series(
        date_trunc(${range.bucket}, (${fromIso}::timestamptz at time zone ${TIMEZONE})),
        date_trunc(${range.bucket}, (${range.to.toISOString()}::timestamptz at time zone ${TIMEZONE})),
        ${range.interval}::interval
      ) as bucket
    ),
    agg as (
      select date_trunc(${range.bucket}, (${dateColumn} at time zone ${TIMEZONE})) as bucket,
             count(*)::int                                   as total,
             count(*) filter (where j.is_international)::int as international
      from jobs j where ${filter}
      group by 1
    )
    select to_char(b.bucket, 'YYYY-MM-DD') as date,
           coalesce(a.total, 0)         as total,
           coalesce(a.international, 0) as international
    from buckets b left join agg a on a.bucket = b.bucket
    order by b.bucket
  `)

  const [kpisRes, stacksRes, workModelRes, levelsRes, categoriesRes, countriesRes, citiesRes, companiesRes, seriesRes] =
    await db.batch([
      kpisStmt,
      stacksStmt,
      workModelStmt,
      levelsStmt,
      categoriesStmt,
      countriesStmt,
      citiesStmt,
      companiesStmt,
      seriesStmt,
    ])

  const k = kpisRes.rows[0] ?? {
    total_current: 0,
    total_previous: 0,
    companies_current: 0,
    companies_previous: 0,
    remote_current: 0,
    remote_previous: 0,
    international_current: 0,
    international_previous: 0,
  }

  const total = Number(k.total_current)

  const stackRows = stacksRes.rows.map((row) => ({
    key: row.key,
    count: Number(row.count),
  }))
  const stackMentions = stackRows.reduce((sum, row) => sum + row.count, 0)

  const topStack = stackRows[0]
    ? {
        key: stackRows[0].key,
        label: getStackLabel(stackRows[0].key),
        count: stackRows[0].count,
      }
    : null

  return {
    period: {
      preset: query.period,
      date_field: query.date_field,
      bucket: range.bucket,
      timezone: TIMEZONE,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      previous_from: range.previousFrom.toISOString(),
    },
    filters: {
      stack: query.stack ?? null,
      country: query.country ?? null,
      level: query.level ?? null,
      job_type: query.job_type ?? null,
      category: query.category ?? null,
      international: query.international ?? null,
    },
    kpis: {
      total_jobs: {
        current: total,
        previous: Number(k.total_previous),
        delta_pct: deltaPct(total, Number(k.total_previous)),
      },
      companies: {
        current: Number(k.companies_current),
        previous: Number(k.companies_previous),
        delta_pct: deltaPct(Number(k.companies_current), Number(k.companies_previous)),
      },
      remote: {
        current: Number(k.remote_current),
        previous: Number(k.remote_previous),
        delta_pct: deltaPct(Number(k.remote_current), Number(k.remote_previous)),
        share_pct: sharePct(Number(k.remote_current), total),
      },
      international: {
        current: Number(k.international_current),
        previous: Number(k.international_previous),
        delta_pct: deltaPct(
          Number(k.international_current),
          Number(k.international_previous),
        ),
        share_pct: sharePct(Number(k.international_current), total),
      },
      top_stack: topStack,
    },
    // Denominador diferente do resto de proposito — ver o comentario do tipo.
    top_stacks: stackRows.map((row) => ({
      key: row.key,
      label: getStackLabel(row.key),
      count: row.count,
      share_pct: sharePct(row.count, stackMentions),
    })),
    stack_mentions_total: stackMentions,
    work_model: workModelRes.rows.map((row) => ({
      key: row.job_type,
      label: WORK_MODEL_LABELS[row.job_type] ?? row.job_type,
      count: Number(row.count),
      share_pct: sharePct(Number(row.count), total),
    })),
    // Ordem ORDINAL, nao por contagem: reordenar uma escala ordinal por
    // magnitude destroi a leitura da distribuicao ("o mercado e senior") quando
    // o dado real e a FORMA da curva. Niveis zerados ficam na lista pelo mesmo
    // motivo — um buraco no meio da escala e informacao.
    levels: JOB_LEVEL_ORDER.map((level) => {
      const row = levelsRes.rows.find((r) => r.level === level)
      const count = row ? Number(row.count) : 0
      return {
        key: level,
        label: JOB_LEVEL_LABELS[level] ?? level,
        count,
        share_pct: sharePct(count, total),
      }
    }),
    categories: categoriesRes.rows.map((row) => ({
      key: row.category,
      label: getJobCategoryLabel(row.category),
      count: Number(row.count),
      share_pct: sharePct(Number(row.count), total),
    })),
    top_countries: countriesRes.rows.map((row) => ({
      key: row.country_code ?? "unknown",
      label:
        row.country ??
        (row.country_code ? COUNTRY_NAME_BY_CODE.get(row.country_code) : null) ??
        (row.country_code || "Não informado"),
      region: null,
      country_code: row.country_code,
      count: Number(row.count),
      share_pct: sharePct(Number(row.count), total),
    })),
    top_cities: citiesRes.rows.map((row) => ({
      key: row.city_key ?? "unknown",
      label: row.city ?? "Não informado",
      region: row.region,
      country_code: row.country_code,
      count: Number(row.count),
      share_pct: sharePct(Number(row.count), total),
    })),
    top_companies: companiesRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      linkedin_url: row.linkedin_url,
      job_count: Number(row.job_count),
      top_level: row.top_level,
      stacks: (row.stacks ?? []).map((key) => ({ key, label: getStackLabel(key) })),
    })),
    time_series: seriesRes.rows.map((row) => ({
      date: row.date,
      total: Number(row.total),
      international: Number(row.international),
    })),
    generated_at: new Date().toISOString(),
  }
}
