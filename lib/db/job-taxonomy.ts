import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { canonicalizeStackTags, type CanonicalStack } from "@/lib/job-stacks"
import { resolveCompanyIdentity } from "@/lib/job-companies"
import { parseJobLocation } from "@/lib/job-location"

// -----------------------------------------------------------------------------
// Taxonomia de vagas: resolucao de empresa e sincronizacao de stacks.
//
// RESTRICAO DO DRIVER — leia antes de mexer: este projeto usa o driver
// neon-http, cujo `db.transaction()` LANCA ERRO INCONDICIONALMENTE
// ("No transactions support in neon-http driver"). E erro de runtime, nao de
// tipo: passa no CI e quebra em producao. Nao procure transacao interativa aqui.
//
// As quatro saidas usadas neste arquivo:
//   1. `db.batch([...])` — atomico no Neon, mas so para statements SEM
//      dependencia de dados entre si.
//   2. gerar o UUID no cliente (`randomUUID()`) para REMOVER a dependencia —
//      padrao ja usado em lib/db/sim.ts.
//   3. CTE de statement unico quando a dependencia e inevitavel (syncJobStacks).
//   4. `ON CONFLICT DO UPDATE ... RETURNING` em vez de `DO NOTHING` quando o id
//      precisa voltar (ver resolveJobCompanyId).
// -----------------------------------------------------------------------------

const PG_UNIQUE_VIOLATION = "23505"

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === PG_UNIQUE_VIOLATION
}

/**
 * Busca a empresa por linkedin_slug > alias > slug, nesta ordem de forca.
 * O `order by` garante que, quando a vaga casa pelos dois caminhos, ganha o
 * registro identificado pelo LinkedIn.
 */
async function findCompanyId(
  slug: string,
  linkedinSlug: string | null,
): Promise<string | null> {
  const rows = await db.execute<{ id: string }>(sql`
    select c.id
    from job_companies c
    where (${linkedinSlug}::text is not null and c.linkedin_slug = ${linkedinSlug})
       or c.slug = ${slug}
       or c.id = (
            select a.company_id from job_company_aliases a
            where a.alias_slug = ${slug}
          )
    order by (c.linkedin_slug is not distinct from ${linkedinSlug}) desc
    limit 1
  `)

  return rows.rows[0]?.id ?? null
}

/**
 * resolveJobCompanyId — devolve o id da empresa no registro global, criando-a
 * se ainda nao existir. Devolve null quando nao ha empresa aproveitavel no
 * payload (caso normal: o Glassdoor as vezes nao traz).
 *
 * Idempotente e seguro sob concorrencia.
 */
export async function resolveJobCompanyId(
  name: string | null | undefined,
  companyUrl: string | null | undefined,
): Promise<string | null> {
  const identity = resolveCompanyIdentity(name, companyUrl)
  if (!identity) return null

  const existing = await findCompanyId(identity.slug, identity.linkedinSlug)
  if (existing) {
    // Promocao: empresa criada so pelo nome, agora vista com a URL do LinkedIn.
    // `coalesce` garante que nunca sobrescrevemos um slug ja conhecido.
    if (identity.linkedinSlug) {
      await db.execute(sql`
        update job_companies set
          last_seen_at  = now(),
          updated_at    = now(),
          linkedin_slug = coalesce(linkedin_slug, ${identity.linkedinSlug}),
          linkedin_url  = coalesce(linkedin_url,  ${identity.linkedinUrl})
        where id = ${existing}
      `)
    } else {
      await db.execute(sql`
        update job_companies set last_seen_at = now() where id = ${existing}
      `)
    }
    return existing
  }

  try {
    // DO UPDATE, nao DO NOTHING: com DO NOTHING o insert nao devolve linha
    // quando o conflito acontece, entao um insert concorrente faria o
    // company_id ficar nulo. DO UPDATE sempre devolve a linha — criada ou
    // pre-existente.
    const inserted = await db.execute<{ id: string }>(sql`
      insert into job_companies (name, slug, linkedin_slug, linkedin_url)
      values (${identity.name}, ${identity.slug}, ${identity.linkedinSlug}, ${identity.linkedinUrl})
      on conflict ("slug") do update set
        last_seen_at  = now(),
        updated_at    = now(),
        linkedin_slug = coalesce(job_companies.linkedin_slug, excluded.linkedin_slug),
        linkedin_url  = coalesce(job_companies.linkedin_url,  excluded.linkedin_url)
      returning id
    `)

    return inserted.rows[0]?.id ?? null
  } catch (error) {
    // Corrida nao coberta pelo ON CONFLICT (slug): outro insert landou o MESMO
    // linkedin_slug sob um slug DIFERENTE, violando o indice parcial. Relemos
    // uma vez; se ainda assim nao achar, a vaga fica sem company_id e o
    // backfill (idempotente) reconcilia depois.
    if (isUniqueViolation(error)) {
      return findCompanyId(identity.slug, identity.linkedinSlug)
    }
    throw error
  }
}

/**
 * buildSyncJobStacksStatement — statement UNICO que (1) cria as stacks que
 * faltam, (2) resolve os ids de TODAS elas (novas + pre-existentes) e (3) liga
 * na vaga. Idempotente ponta a ponta.
 *
 * Aqui o `DO NOTHING` em `stacks` esta correto — ao contrario do caso da
 * empresa — porque o ramo UNION ALL do CTE `resolved` recupera os ids das
 * linhas que o insert pulou.
 *
 * Devolve o statement (nao executa) para poder entrar num `db.batch` junto do
 * insert da vaga, e assim vaga + vinculos caírem na mesma transacao do Neon.
 */
export function buildSyncJobStacksStatement(jobId: string, stacks: CanonicalStack[]) {
  const keys = stacks.map((stack) => stack.key)
  const labels = stacks.map((stack) => stack.label)
  const categories = stacks.map((stack) => stack.category)

  return db.execute(sql`
    with input(key, label, category) as (
      select * from unnest(
        ${keys}::text[],
        ${labels}::text[],
        ${categories}::text[]
      )
    ),
    ins as (
      insert into stacks (key, label, category)
      select key, label, category from input
      on conflict ("key") do nothing
      returning id, key
    ),
    resolved as (
      select id, key from ins
      union all
      select s.id, s.key from stacks s
      join input i on i.key = s.key
      where not exists (select 1 from ins where ins.key = s.key)
    )
    insert into job_stacks (job_id, stack_id)
    select ${jobId}::uuid, r.id from resolved r
    on conflict ("job_id", "stack_id") do nothing
  `)
}

/**
 * syncJobStacks — normaliza as tags cruas e grava os vinculos da vaga.
 *
 * TODO caminho que escreve `jobs.stack_tags` deve chamar isto, senao o array e
 * a tabela de ligacao divergem e o painel passa a mostrar numero errado (o
 * contador `jobs_without_stacks` do endpoint de insights existe para tornar
 * essa divergencia visivel).
 */
export async function syncJobStacks(
  jobId: string,
  tags: readonly string[] | null | undefined,
): Promise<number> {
  const stacks = canonicalizeStackTags(tags)
  if (stacks.length === 0) return 0

  await buildSyncJobStacksStatement(jobId, stacks)
  return stacks.length
}

/**
 * resyncJobStacks — versao de ATUALIZACAO do syncJobStacks: alem de inserir os
 * vinculos novos, APAGA os que sairam da lista.
 *
 * Os handlers de PUT (admin e dono da vaga) trocam `jobs.stack_tags` inteiro;
 * usar syncJobStacks ali deixaria a stack removida pendurada em job_stacks e o
 * painel continuaria contando uma tecnologia que a vaga nao pede mais.
 */
export async function resyncJobStacks(
  jobId: string,
  tags: readonly string[] | null | undefined,
): Promise<number> {
  const stacks = canonicalizeStackTags(tags)

  if (stacks.length === 0) {
    await db.execute(sql`delete from job_stacks where job_id = ${jobId}::uuid`)
    return 0
  }

  const keys = stacks.map((stack) => stack.key)

  const removeDropped = db.execute(sql`
    delete from job_stacks js
    using stacks s
    where js.job_id = ${jobId}::uuid
      and s.id = js.stack_id
      and not (s.key = any(${keys}::text[]))
  `)

  // Atomico: a vaga nunca fica num estado com as stacks antigas ja apagadas e
  // as novas ainda nao inseridas.
  await db.batch([removeDropped, buildSyncJobStacksStatement(jobId, stacks)])
  return stacks.length
}

export type JobTaxonomyColumns = {
  companyId?: string | null
  city?: string | null
  cityKey?: string | null
  region?: string | null
  countryName?: string | null
  countryCode?: string | null
}

/**
 * resolveJobTaxonomyColumns — colunas normalizadas a mesclar num UPDATE de vaga
 * quando `company` ou `location` mudaram. Sem isto, editar a empresa pela tela
 * do admin trocaria o texto e deixaria `company_id` apontando para a empresa
 * antiga.
 *
 * Cada campo so entra no retorno quando veio no payload (undefined = "nao
 * mexer"), para o UPDATE continuar parcial.
 */
export async function resolveJobTaxonomyColumns(input: {
  company?: string | null
  companyUrl?: string | null
  location?: string | null
  isInternational?: boolean
}): Promise<JobTaxonomyColumns> {
  const columns: JobTaxonomyColumns = {}

  if (input.company !== undefined) {
    try {
      columns.companyId = await resolveJobCompanyId(input.company, input.companyUrl ?? null)
    } catch (error) {
      console.error("[job-taxonomy] falha ao resolver empresa no update", {
        company: input.company,
        message: (error as Error).message,
      })
    }
  }

  if (input.location !== undefined) {
    const parsed = parseJobLocation(input.location, {
      isInternational: input.isInternational,
    })
    columns.city = parsed.city
    columns.cityKey = parsed.cityKey
    columns.region = parsed.region
    columns.countryName = parsed.countryName
    columns.countryCode = parsed.countryCode
  }

  return columns
}

export type CompanyStack = {
  key: string
  label: string
  job_count: number
  last_seen_at: string | null
}

/**
 * getCompanyStacks — as stacks de uma empresa, por frequencia. E a funcao que
 * responde a pergunta de produto "quais stacks a empresa X usa" e alimenta o
 * drawer de empresa em /jobs/insights.
 *
 * Le a view `job_company_stacks` (historico completo, sem recorte de periodo).
 * O painel de "empresas que mais contratam" NAO usa isto: la o recorte de
 * periodo importa, entao a agregacao vai junto com o resto das queries.
 */
export async function getCompanyStacks(
  companyId: string,
  options: { limit?: number } = {},
): Promise<CompanyStack[]> {
  const limit = options.limit ?? 30

  const result = await db.execute<{
    stack_key: string
    stack_label: string
    job_count: number
    last_seen_at: string | null
  }>(sql`
    select stack_key, stack_label, job_count, last_seen_at
    from job_company_stacks
    where company_id = ${companyId}::uuid
    order by job_count desc, stack_key asc
    limit ${limit}
  `)

  return result.rows.map((row) => ({
    key: row.stack_key,
    label: row.stack_label,
    job_count: Number(row.job_count),
    last_seen_at: row.last_seen_at,
  }))
}

export type CompanyProfile = {
  id: string
  name: string
  slug: string
  linkedin_url: string | null
  job_count: number
  first_seen_at: string | null
  last_seen_at: string | null
  stacks: CompanyStack[]
  levels: { level: string; count: number }[]
  locations: { label: string; country_code: string | null; count: number }[]
  recent_jobs: { id: string; title: string; created_at: string }[]
}

/**
 * getCompanyProfile — o que o drawer de empresa da pagina publica mostra.
 * So conta vaga APROVADA: a pagina e publica.
 *
 * Devolve null quando a empresa nao existe ou nao tem nenhuma vaga aprovada —
 * empresa so com vaga pendente nao pode ser confirmada publicamente como
 * contratante.
 */
export async function getCompanyProfile(
  companyId: string,
): Promise<CompanyProfile | null> {
  const companyRes = await db.execute<{
    id: string
    name: string
    slug: string
    linkedin_url: string | null
    first_seen_at: string | null
    last_seen_at: string | null
    job_count: number
  }>(sql`
    select c.id, c.name, c.slug, c.linkedin_url, c.first_seen_at, c.last_seen_at,
           (select count(*)::int from jobs j
             where j.company_id = c.id and j.status = 'approved') as job_count
    from job_companies c
    where c.id = ${companyId}::uuid
    limit 1
  `)

  const company = companyRes.rows[0]
  if (!company || Number(company.job_count) === 0) return null

  const stacksStmt = db.execute<{
    stack_key: string
    stack_label: string
    job_count: number
  }>(sql`
    select s.key as stack_key, s.label as stack_label, count(*)::int as job_count
    from jobs j
    join job_stacks js on js.job_id = j.id
    join stacks s      on s.id = js.stack_id
    where j.company_id = ${companyId}::uuid and j.status = 'approved'
    group by s.key, s.label
    order by count(*) desc, s.key asc
    limit 40
  `)

  const levelsStmt = db.execute<{ level: string; count: number }>(sql`
    select j.level, count(*)::int as count
    from jobs j
    where j.company_id = ${companyId}::uuid and j.status = 'approved'
    group by j.level
  `)

  const locationsStmt = db.execute<{
    label: string | null
    country_code: string | null
    count: number
  }>(sql`
    select coalesce(mode() within group (order by j.city), j.country_name) as label,
           j.country_code,
           count(*)::int as count
    from jobs j
    where j.company_id = ${companyId}::uuid and j.status = 'approved'
    group by j.city_key, j.country_code, j.country_name
    order by count(*) desc
    limit 10
  `)

  const jobsStmt = db.execute<{ id: string; title: string; created_at: string }>(sql`
    select j.id, j.title, to_char(j.created_at, 'YYYY-MM-DD') as created_at
    from jobs j
    where j.company_id = ${companyId}::uuid and j.status = 'approved'
    order by j.created_at desc
    limit 8
  `)

  const [stacksRes, levelsRes, locationsRes, jobsRes] = await db.batch([
    stacksStmt,
    levelsStmt,
    locationsStmt,
    jobsStmt,
  ])

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    linkedin_url: company.linkedin_url,
    job_count: Number(company.job_count),
    first_seen_at: company.first_seen_at,
    last_seen_at: company.last_seen_at,
    stacks: stacksRes.rows.map((row) => ({
      key: row.stack_key,
      label: row.stack_label,
      job_count: Number(row.job_count),
      last_seen_at: null,
    })),
    levels: levelsRes.rows.map((row) => ({
      level: row.level,
      count: Number(row.count),
    })),
    locations: locationsRes.rows.map((row) => ({
      label: row.label ?? "Não informado",
      country_code: row.country_code,
      count: Number(row.count),
    })),
    recent_jobs: jobsRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
    })),
  }
}
