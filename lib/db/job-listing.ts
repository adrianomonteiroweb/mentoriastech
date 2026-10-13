import { sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  IS_NATIONAL,
  buildJobListFilters,
  buildKeysetCondition,
  buildOrderBy,
  composeWhere,
  decodeCursor,
  encodeCursor,
  relevanceRank,
  resolveSort,
  type FilterKey,
  type JobListQuery,
  type JobSort,
} from "@/lib/job-list-query"
import {
  getAreaFamilyLabel,
  getAreaSpecialtyLabel,
  getInclusionLabel,
} from "@/lib/job-areas"
import { getStackLabel } from "@/lib/job-stacks"
import { getJobCategoryLabel } from "@/lib/job-options"
import {
  JOB_LEVEL_SHORT_LABELS as LEVEL_LABELS,
  JOB_TYPE_LABELS as WORK_MODEL_LABELS,
} from "@/lib/job-labels"
import { COUNTRY_NAME_BY_CODE } from "@/lib/job-location"

// -----------------------------------------------------------------------------
// Acesso ao banco para a listagem publica de vagas.
//
// A montagem da consulta (schema da query, filtros, ordenacao, cursor) vive em
// lib/job-list-query.ts, que e puro e nao depende de conexao. Aqui fica so o
// que executa.
//
// O QUE ISTO SUBSTITUI: a rota antiga fazia um SELECT de todas as vagas
// aprovadas, um GROUP BY da tabela inteira de job_actions so para contar
// curtidas, ordenava em JS e devolvia o array completo — e o cliente filtrava
// com Array.filter. Com ~1500 vagas/dia, megabytes por acesso.
// -----------------------------------------------------------------------------

// Reexporta o que as rotas consomem, para elas continuarem com um import so.
export {
  jobListQuerySchema,
  parseJobListQuery,
  JOB_SORTS,
  JOB_POSTED_WINDOWS,
  buildJobListFilters,
  composeWhere,
} from "@/lib/job-list-query"
export type { JobListQuery, JobSort, FilterKey } from "@/lib/job-list-query"

// -----------------------------------------------------------------------------
// Consulta principal
// -----------------------------------------------------------------------------

export type JobListItem = {
  id: string
  title: string
  company: string | null
  description: string | null
  description_en: string | null
  stack_tags: string[]
  recommendation_note: string | null
  location: string | null
  country_code: string | null
  job_type: "remote" | "hybrid" | "onsite"
  level: string
  level_inferred: boolean
  category: string
  area_family: string | null
  area_specialty: string | null
  inclusion_tags: string[]
  salary_range: string | null
  application_url: string | null
  is_international: boolean
  required_language: string | null
  language_level: string | null
  summary: string | null
  important_note: string | null
  like_count: number
  source_posted_at: string
  created_at: string
  posted_by_name: string | null
}

export type JobListResult = {
  data: JobListItem[]
  next_cursor: string | null
  sort: JobSort
}

type JobListRow = Omit<JobListItem, "source_posted_at" | "created_at"> & {
  source_posted_at: Date | string
  created_at: Date | string
  _rank?: number
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export async function listJobs(query: JobListQuery): Promise<JobListResult> {
  const sort = resolveSort(query)
  const rank = query.q ? relevanceRank(query.q) : null
  const parts = buildJobListFilters(query)

  const clauses: SQL[] = [composeWhere(parts)]

  const cursor = decodeCursor(query.cursor)
  if (cursor) clauses.push(buildKeysetCondition(sort, rank, cursor))

  const where = sql.join(clauses, sql` and `)
  const orderBy = buildOrderBy(sort, rank)

  // Pede uma linha a mais que o limite: a presenca dela e o que diz se existe
  // proxima pagina, sem precisar de um count() extra.
  const fetchLimit = query.limit + 1
  const rankSelect = rank ? sql`${rank} as _rank,` : sql``

  const rows = (await db.execute(sql`
    select
      j.id, j.title, j.company, j.description, j.description_en,
      j.stack_tags, j.recommendation_note, j.location, j.country_code,
      j.job_type, j.level, j.level_inferred, j.category,
      j.area_family, j.area_specialty, j.inclusion_tags,
      j.salary_range, j.application_url, j.is_international,
      j.required_language, j.language_level, j.summary, j.important_note,
      j.like_count, j.source_posted_at, j.created_at,
      ${rankSelect}
      p.full_name as posted_by_name
    from jobs j
    left join profiles p on p.id = j.posted_by
    where ${where}
    order by ${orderBy}
    limit ${fetchLimit}
  `)) as unknown as { rows: JobListRow[] }

  const all = rows.rows ?? []
  const hasMore = all.length > query.limit
  const page = hasMore ? all.slice(0, query.limit) : all

  const last = page[page.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          rank: last._rank,
          likeCount: sort === "popular" ? last.like_count : undefined,
          createdAt: toIso(last.created_at),
          id: last.id,
        })
      : null

  return {
    data: page.map((row) => ({
      ...row,
      stack_tags: row.stack_tags ?? [],
      inclusion_tags: row.inclusion_tags ?? [],
      source_posted_at: toIso(row.source_posted_at),
      created_at: toIso(row.created_at),
      _rank: undefined,
    })) as JobListItem[],
    next_cursor: nextCursor,
    sort,
  }
}

// -----------------------------------------------------------------------------
// Facetas
//
// Para que servem: hoje a pessoa aplica um filtro e SO ENTAO descobre que deu
// zero. Com a contagem por opcao, o filtro diz de antemao o que cada escolha
// produz, e opcoes vazias podem ser desabilitadas em vez de virarem beco sem
// saida.
//
// Cada faceta ignora a PROPRIA dimensao (ver buildJobListFilters): escolher
// "Front-end" nao pode zerar a contagem das outras especialidades, senao nao da
// para TROCAR de filtro, so limpar tudo.
// -----------------------------------------------------------------------------

export type FacetBucket = { key: string; label: string; count: number }

export type JobFacets = {
  total: number
  families: FacetBucket[]
  specialties: FacetBucket[]
  levels: FacetBucket[]
  job_types: FacetBucket[]
  scopes: FacetBucket[]
  countries: FacetBucket[]
  stacks: FacetBucket[]
  inclusion: FacetBucket[]
  /** `jobs.category` legado. Ainda alimenta o formulario de HR e o admin. */
  categories: FacetBucket[]
  /** Quantas vagas entraram hoje, no fuso de Sao Paulo. */
  today: number
  generated_at: string
}

type CountRow = { key: string | null; count: number }

function toBuckets(
  rows: CountRow[],
  label: (key: string) => string,
  options: { limit?: number } = {},
): FacetBucket[] {
  const buckets = rows
    .filter((row) => row.key !== null && row.key !== "")
    .map((row) => ({
      key: String(row.key),
      label: label(String(row.key)),
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))

  return options.limit ? buckets.slice(0, options.limit) : buckets
}

/**
 * Conta as facetas para o conjunto de filtros ativo.
 *
 * Tudo num `db.batch`: um round trip (o driver neon-http paga HTTPS por
 * statement) e, mais importante, UM SNAPSHOT — sem isso cada faceta leria um
 * estado diferente do banco e as contagens nao fechariam entre si, num feed que
 * recebe vagas o tempo todo. Mesmo motivo de lib/db/job-insights.ts.
 */
export async function getJobFacets(query: JobListQuery): Promise<JobFacets> {
  const parts = buildJobListFilters(query)

  const scoped = (except?: FilterKey) => composeWhere(parts, { except })

  const [
    totalRes,
    familyRes,
    specialtyRes,
    levelRes,
    jobTypeRes,
    scopeRes,
    countryRes,
    stackRes,
    inclusionRes,
    categoryRes,
    todayRes,
  ] = await db.batch([
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from jobs j where ${scoped()}`,
    ),
    db.execute<CountRow>(
      sql`select j.area_family as key, count(*)::int as count from jobs j
          where ${scoped("family")} group by j.area_family`,
    ),
    db.execute<CountRow>(
      sql`select j.area_specialty as key, count(*)::int as count from jobs j
          where ${scoped("specialty")} group by j.area_specialty`,
    ),
    db.execute<CountRow>(
      sql`select j.level as key, count(*)::int as count from jobs j
          where ${scoped("level")} group by j.level`,
    ),
    db.execute<CountRow>(
      sql`select j.job_type as key, count(*)::int as count from jobs j
          where ${scoped("job_type")} group by j.job_type`,
    ),
    db.execute<CountRow>(
      sql`select case when ${IS_NATIONAL} then 'br' else 'world' end as key,
                 count(*)::int as count
          from jobs j where ${scoped("scope")} group by 1`,
    ),
    db.execute<CountRow>(
      sql`select j.country_code as key, count(*)::int as count from jobs j
          where ${scoped("country")} and j.country_code is not null
          group by j.country_code order by count(*) desc limit 30`,
    ),
    db.execute<CountRow>(
      sql`select s.key as key, count(*)::int as count
          from jobs j
          join job_stacks js on js.job_id = j.id
          join stacks s on s.id = js.stack_id
          where ${scoped("stack")}
          group by s.key order by count(*) desc limit 40`,
    ),
    db.execute<CountRow>(
      sql`select tag as key, count(*)::int as count
          from jobs j, unnest(j.inclusion_tags) tag
          where ${scoped("inclusion")} group by tag`,
    ),
    db.execute<CountRow>(
      sql`select j.category as key, count(*)::int as count from jobs j
          where ${scoped()} and j.category is not null and j.category <> ''
          group by j.category order by count(*) desc limit 60`,
    ),
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from jobs j
          where ${scoped("posted")}
            and j.created_at >= (now() at time zone 'America/Sao_Paulo')::date`,
    ),
  ])

  return {
    total: totalRes.rows[0]?.count ?? 0,
    families: toBuckets(familyRes.rows, getAreaFamilyLabel),
    specialties: toBuckets(specialtyRes.rows, getAreaSpecialtyLabel),
    levels: toBuckets(levelRes.rows, (k) => LEVEL_LABELS[k] ?? k),
    job_types: toBuckets(jobTypeRes.rows, (k) => WORK_MODEL_LABELS[k] ?? k),
    scopes: toBuckets(scopeRes.rows, (k) =>
      k === "br" ? "Brasil" : "Internacional",
    ),
    countries: toBuckets(
      countryRes.rows,
      (k) => COUNTRY_NAME_BY_CODE.get(k) ?? k,
    ),
    stacks: toBuckets(stackRes.rows, getStackLabel),
    inclusion: toBuckets(inclusionRes.rows, getInclusionLabel),
    categories: toBuckets(categoryRes.rows, getJobCategoryLabel),
    today: todayRes.rows[0]?.count ?? 0,
    generated_at: new Date().toISOString(),
  }
}

// -----------------------------------------------------------------------------
// Vaga individual (/jobs/[id])
// -----------------------------------------------------------------------------

export type JobDetail = JobListItem & {
  city: string | null
  region: string | null
  country_name: string | null
  expires_at: string | null
  updated_at: string
  view_count: number
}

type JobDetailRow = Omit<
  JobDetail,
  "source_posted_at" | "created_at" | "updated_at" | "expires_at"
> & {
  source_posted_at: Date | string
  created_at: Date | string
  updated_at: Date | string
  expires_at: Date | string | null
}

/**
 * Uma vaga aprovada, pelo id.
 *
 * `status = 'approved'` e parte da consulta, nao um filtro aplicado depois:
 * esta e uma rota PUBLICA, e vaga pendente ou rejeitada nao pode vazar por
 * alguem adivinhar um UUID.
 *
 * Devolve null (e nao lanca) quando nao existe, para a pagina responder 404 de
 * verdade em vez de 500.
 */
export async function getPublicJob(id: string): Promise<JobDetail | null> {
  // Sem esta guarda, um id malformado estoura no cast do Postgres e vira 500.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null
  }

  const result = (await db.execute(sql`
    select
      j.id, j.title, j.company, j.description, j.description_en,
      j.stack_tags, j.recommendation_note, j.location,
      j.city, j.region, j.country_name, j.country_code,
      j.job_type, j.level, j.level_inferred, j.category,
      j.area_family, j.area_specialty, j.inclusion_tags,
      j.salary_range, j.application_url, j.is_international,
      j.required_language, j.language_level, j.summary, j.important_note,
      j.like_count, j.view_count, j.source_posted_at, j.created_at,
      j.updated_at, j.expires_at,
      p.full_name as posted_by_name
    from jobs j
    left join profiles p on p.id = j.posted_by
    where j.id = ${id}::uuid and j.status = 'approved'
    limit 1
  `)) as unknown as { rows: JobDetailRow[] }

  const row = result.rows?.[0]
  if (!row) return null

  return {
    ...row,
    stack_tags: row.stack_tags ?? [],
    inclusion_tags: row.inclusion_tags ?? [],
    source_posted_at: toIso(row.source_posted_at),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    expires_at: row.expires_at ? toIso(row.expires_at) : null,
  } as JobDetail
}

/**
 * Ids das vagas aprovadas para o sitemap.
 *
 * Teto explicito: o sitemap do Next e um arquivo so, e o limite do protocolo e
 * 50 mil URLs. Com ~1500 vagas/dia, as mais recentes sao as que importam —
 * vaga velha ja saiu do ar na origem.
 */
export async function listJobIdsForSitemap(limit = 5000) {
  const result = (await db.execute(sql`
    select j.id, j.updated_at
    from jobs j
    where j.status = 'approved'
    order by j.created_at desc
    limit ${limit}
  `)) as unknown as { rows: { id: string; updated_at: Date | string }[] }

  return (result.rows ?? []).map((row) => ({
    id: row.id,
    updatedAt: new Date(row.updated_at),
  }))
}
