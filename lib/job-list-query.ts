import { sql, type SQL } from "drizzle-orm"
import { z } from "zod"
import {
  AREA_FAMILY_KEYS,
  INCLUSION_TAG_KEYS,
  JOB_LEVELS,
  getAreaFamilyLabel,
  getAreaSpecialtyLabel,
  getInclusionLabel,
} from "@/lib/job-areas"
import { getStackLabel } from "@/lib/job-stacks"
import { getJobCategoryLabel } from "@/lib/job-options"
import { COUNTRY_NAME_BY_CODE } from "@/lib/job-location"

// -----------------------------------------------------------------------------
// Montagem da consulta de vagas: filtros, ordenacao e cursor.
//
// Modulo PURO de proposito — nao importa `@/lib/db`. Assim o parser da query
// pode ser usado pelo componente de pagina e testado sem exigir DATABASE_URL;
// quem toca o banco e lib/db/job-listing.ts.
//
// O QUE ISTO SUBSTITUI
//
// A rota antiga fazia um SELECT de todas as vagas aprovadas, um GROUP BY da
// tabela inteira de job_actions so para contar curtidas, ordenava em JS e
// devolvia o array completo — e o cliente filtrava com Array.filter. Com ~1500
// vagas/dia isso e megabytes de JSON por acesso, em 4G, antes de pintar um
// pixel.
//
// PAGINACAO POR KEYSET, NAO OFFSET
//
// OFFSET precisa varrer e descartar as N linhas anteriores (degrada conforme a
// pessoa rola) e, pior, DUPLICA itens quando vagas novas entram no topo durante
// a rolagem — e entram o tempo todo neste produto. O keyset compara a tupla de
// ordenacao com a ultima linha vista: estavel e com custo constante.
//
// O padrao de montagem de filtro espelha `buildJobFilter` de lib/db/job-insights.ts.
// -----------------------------------------------------------------------------

/** Aceita "a,b,c" ou ?p=a&p=b. Normaliza, deduplica e descarta vazio. */
function csv(values: readonly string[]) {
  return z
    .preprocess(
      (raw) => {
        if (raw === undefined || raw === null || raw === "") return []
        const list = Array.isArray(raw) ? raw : [raw]
        const flat = list.flatMap((item) => String(item).split(","))
        return Array.from(
          new Set(flat.map((s) => s.trim().toLowerCase()).filter(Boolean)),
        )
      },
      z.array(z.string()),
    )
    // Valor fora do catalogo e DESCARTADO, nao rejeitado: uma URL compartilhada
    // com um filtro que nao existe mais tem de abrir a lista, nunca dar erro.
    .transform((list) => list.filter((v) => (values as readonly string[]).includes(v)))
}

export const JOB_SORTS = ["recent", "popular", "relevant"] as const
export type JobSort = (typeof JOB_SORTS)[number]

export const JOB_POSTED_WINDOWS = {
  today: 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
} as const

export const jobListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  family: csv(AREA_FAMILY_KEYS),
  // Especialidade NAO e validada contra o catalogo: ela e criada em TS e cresce
  // sem migracao, e uma chave desconhecida simplesmente nao casa nenhuma linha.
  specialty: z.preprocess(
    (raw) => splitLoose(raw),
    z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(20),
  ),
  level: csv(JOB_LEVELS),
  job_type: csv(["remote", "hybrid", "onsite"]),
  scope: z.enum(["all", "br", "world"]).default("all"),
  country: z.preprocess(
    (raw) => splitLoose(raw).map((s) => s.toUpperCase()),
    z.array(z.string().regex(/^[A-Z]{2}$/)).max(20),
  ),
  stack: z.preprocess(
    (raw) => splitLoose(raw),
    z.array(z.string().max(60)).max(20),
  ),
  inclusion: csv(INCLUSION_TAG_KEYS),
  company: z.string().trim().max(120).optional(),
  has_salary: z.enum(["true", "false"]).optional(),
  posted: z.enum(["today", "3d", "7d", "30d"]).optional(),
  sort: z.enum(JOB_SORTS).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

function splitLoose(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === "") return []
  const list = Array.isArray(raw) ? raw : [raw]
  const flat = list.flatMap((item) => String(item).split(","))
  return Array.from(new Set(flat.map((s) => s.trim().toLowerCase()).filter(Boolean)))
}

export type JobListQuery = z.infer<typeof jobListQuerySchema>

/**
 * Le os filtros de um URLSearchParams. Nunca lanca: parametro invalido vira o
 * default. Uma URL compartilhada que nao parseia tem de abrir a lista.
 */
export function parseJobListQuery(params: URLSearchParams): JobListQuery {
  const raw: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    raw[key] = all.length > 1 ? all : all[0]
  }

  const parsed = jobListQuerySchema.safeParse(raw)
  return parsed.success ? parsed.data : jobListQuerySchema.parse({})
}

// -----------------------------------------------------------------------------
// Fragmentos de filtro
// -----------------------------------------------------------------------------

/**
 * "Vaga do Brasil". `country_code` e o campo normalizado e tem precedencia;
 * o regex em `location` e o fallback para as vagas anteriores a taxonomia de
 * localidade, e reproduz o `hasBrazilianLocation` que o portal antigo fazia no
 * cliente — o bot marca como internacional vaga cuja localidade aponta para o
 * Brasil.
 */
export const IS_NATIONAL = sql`(
  j.country_code = 'BR'
  or (j.country_code is null and j.is_international = false)
  or j.location ~* '(brasil|brazil)'
)`

export type FilterKey =
  | "q"
  | "family"
  | "specialty"
  | "level"
  | "job_type"
  | "scope"
  | "country"
  | "stack"
  | "inclusion"
  | "company"
  | "has_salary"
  | "posted"

/**
 * Monta os filtros SEPARADOS POR DIMENSAO.
 *
 * Separados porque as contagens de faceta precisam excluir a propria dimensao:
 * ao escolher "Front-end", as outras especialidades tem de continuar mostrando
 * quantas vagas TERIA se voce trocasse — se a propria dimensao entrasse no
 * filtro, todas as outras apareceriam como 0 e o filtro viraria um beco sem
 * saida.
 */
export function buildJobListFilters(query: JobListQuery): Map<FilterKey, SQL> {
  const parts = new Map<FilterKey, SQL>()

  if (query.q) {
    // unaccent nao esta garantido no banco; o lado TS ja manda minusculo e a
    // comparacao e ILIKE, que resolve caixa. Acento fica a cargo do pg_trgm.
    const like = `%${query.q.replace(/[%_]/g, (m) => `\\${m}`)}%`
    parts.set(
      "q",
      sql`(
        j.title ilike ${like}
        or j.company ilike ${like}
        or exists (
          select 1 from unnest(j.stack_tags) tag where tag ilike ${like}
        )
      )`,
    )
  }

  if (query.family.length > 0) {
    parts.set("family", sql`j.area_family = any(${query.family})`)
  }
  if (query.specialty.length > 0) {
    parts.set("specialty", sql`j.area_specialty = any(${query.specialty})`)
  }
  if (query.level.length > 0) {
    parts.set("level", sql`j.level = any(${query.level})`)
  }
  if (query.job_type.length > 0) {
    parts.set("job_type", sql`j.job_type = any(${query.job_type})`)
  }
  if (query.scope === "br") parts.set("scope", IS_NATIONAL)
  if (query.scope === "world") parts.set("scope", sql`not ${IS_NATIONAL}`)

  if (query.country.length > 0) {
    parts.set("country", sql`j.country_code = any(${query.country})`)
  }
  if (query.inclusion.length > 0) {
    // && = "tem interseccao com". Usa o indice GIN de inclusion_tags.
    parts.set("inclusion", sql`j.inclusion_tags && ${query.inclusion}`)
  }
  if (query.stack.length > 0) {
    parts.set(
      "stack",
      sql`exists (
        select 1 from job_stacks js0
        join stacks s0 on s0.id = js0.stack_id
        where js0.job_id = j.id and s0.key = any(${query.stack})
      )`,
    )
  }
  if (query.company) {
    parts.set("company", sql`j.company ilike ${`%${query.company}%`}`)
  }
  if (query.has_salary === "true") {
    parts.set("has_salary", sql`(j.salary_range is not null and j.salary_range <> '')`)
  }
  if (query.posted) {
    const days = JOB_POSTED_WINDOWS[query.posted]
    parts.set(
      "posted",
      sql`j.created_at >= (now() at time zone 'America/Sao_Paulo')::date - make_interval(days => ${days - 1})`,
    )
  }

  return parts
}

/** Junta os filtros num WHERE, opcionalmente pulando uma dimensao (facetas). */
export function composeWhere(
  parts: Map<FilterKey, SQL>,
  options: { except?: FilterKey } = {},
): SQL {
  const clauses: SQL[] = [sql`j.status = 'approved'`]

  for (const [key, clause] of parts) {
    if (key === options.except) continue
    clauses.push(clause)
  }

  return sql.join(clauses, sql` and `)
}

// -----------------------------------------------------------------------------
// Ordenacao e cursor
//
// Cada ordenacao define uma TUPLA de ordenacao que termina sempre em `id`. O
// `id` e o que torna a ordem total: sem ele, duas vagas criadas no mesmo
// instante teriam ordem indefinida e a paginacao por keyset poderia pular ou
// repetir uma delas.
// -----------------------------------------------------------------------------

/**
 * Relevancia da busca, como inteiro pequeno e ESTAVEL (menor = melhor).
 *
 * Inteiro, e nao um score continuo tipo similarity(), porque o valor entra no
 * cursor: precisa ser reproduzivel exatamente na pagina seguinte. Tambem evita
 * depender de pg_trgm estar instalado.
 */
export function relevanceRank(q: string): SQL {
  const prefix = `${q.replace(/[%_]/g, (m) => `\\${m}`)}%`
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`
  return sql`(case
    when j.title ilike ${prefix} then 0
    when j.title ilike ${like} then 1
    when j.company ilike ${like} then 2
    else 3
  end)`
}

export function resolveSort(query: JobListQuery): JobSort {
  if (query.sort) return query.sort
  // Com busca ativa, "mais recente" e quase aleatorio: as vagas sao quase todas
  // do mesmo dia. Relevancia e o default util nesse caso.
  return query.q ? "relevant" : "recent"
}

export type CursorValues = { rank?: number; likeCount?: number; createdAt: string; id: string }

export function encodeCursor(values: CursorValues): string {
  const parts = [
    values.rank ?? "",
    values.likeCount ?? "",
    values.createdAt,
    values.id,
  ]
  return Buffer.from(parts.join("|"), "utf8").toString("base64url")
}

/** Cursor corrompido devolve null: a lista recomeca do topo em vez de quebrar. */
export function decodeCursor(cursor: string | undefined): CursorValues | null {
  if (!cursor) return null
  try {
    const [rank, likeCount, createdAt, id] = Buffer.from(cursor, "base64url")
      .toString("utf8")
      .split("|")

    if (!createdAt || !id) return null
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    if (Number.isNaN(Date.parse(createdAt))) return null

    return {
      rank: rank === "" ? undefined : Number(rank),
      likeCount: likeCount === "" ? undefined : Number(likeCount),
      createdAt,
      id,
    }
  } catch {
    return null
  }
}

export function buildOrderBy(sort: JobSort, rank: SQL | null): SQL {
  if (sort === "popular") {
    return sql`j.like_count desc, j.created_at desc, j.id desc`
  }
  if (sort === "relevant" && rank) {
    return sql`${rank} asc, j.created_at desc, j.id desc`
  }
  return sql`j.created_at desc, j.id desc`
}

/**
 * Condicao de keyset: "estritamente depois da ultima linha vista", na mesma
 * ordem do ORDER BY. Comparacao lexicografica escrita a mao porque as direcoes
 * se misturam (rank ASC + created_at DESC) e a forma curta `(a,b) < (x,y)` do
 * Postgres exige direcao unica.
 */
export function buildKeysetCondition(
  sort: JobSort,
  rank: SQL | null,
  cursor: CursorValues,
): SQL {
  const after = sql`(j.created_at < ${cursor.createdAt}::timestamptz
    or (j.created_at = ${cursor.createdAt}::timestamptz and j.id < ${cursor.id}::uuid))`

  if (sort === "popular" && cursor.likeCount !== undefined) {
    return sql`(j.like_count < ${cursor.likeCount}
      or (j.like_count = ${cursor.likeCount} and ${after}))`
  }

  if (sort === "relevant" && rank && cursor.rank !== undefined) {
    return sql`(${rank} > ${cursor.rank}
      or (${rank} = ${cursor.rank} and ${after}))`
  }

  return after
}
