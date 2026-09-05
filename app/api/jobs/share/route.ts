import { randomUUID, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, jobs } from "@/lib/db"
import { buildSyncJobStacksStatement, resolveJobCompanyId } from "@/lib/db/job-taxonomy"
import { toJob } from "@/lib/db/mappers"
import { getJobSourcePostedAt } from "@/lib/job-active-time"
import { normalizeCityKey, normalizeCountryCode, parseJobLocation } from "@/lib/job-location"
import { canonicalizeStackTags } from "@/lib/job-stacks"
import { jobShareSchema } from "@/lib/job-validation"
import { requireRole } from "@/lib/utils/auth"

// Limite de corpo: a indicacao e enxuta, mas o bot de busca pode enviar a
// descricao completa da vaga (ate 10k chars) para enriquecer o banco de uma vez.
const MAX_BODY_BYTES = 32 * 1024

// Valida o Bearer token do bot com comparacao timing-safe. Sem env configurada,
// o caminho bot fica desabilitado (retorna false).
function isValidBotToken(request: Request): boolean {
  const expected = process.env.JOBS_SHARE_BOT_TOKEN
  if (!expected) return false

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

type ShareInput = ReturnType<typeof jobShareSchema.parse>

/**
 * Localidade normalizada da vaga. O bot do LinkedIn manda os campos prontos;
 * Glassdoor e cadastro manual mandam so o `location` livre, entao aqui fazemos
 * o parse no servidor. E isso que poe as vagas das outras origens nos mesmos
 * graficos sem precisar mexer nos outros bots.
 */
function resolveLocation(input: ShareInput) {
  const parsed = parseJobLocation(input.location, {
    isInternational: input.is_international,
  })

  const city = input.city ?? parsed.city
  const countryCode = normalizeCountryCode(input.country_code) ?? parsed.countryCode

  return {
    city,
    cityKey: normalizeCityKey(city),
    region: input.region ?? parsed.region,
    countryName: input.country ?? parsed.countryName,
    countryCode,
    // Só usado quando o payload NÃO traz job_type — nunca sobrescreve o
    // explícito.
    workModelHint: parsed.workModelHint,
  }
}

// POST: indicar vaga. Dois caminhos:
//  - bot externo via Bearer token (publico, autor = perfil bot dedicado)
//  - usuario autenticado da plataforma (fluxo existente, autor = profile.id)
// Em ambos a vaga entra como pendente — admin aprova.
export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Corpo muito grande" }, { status: 413 })
    }

    let postedBy: string

    if (isValidBotToken(request)) {
      const botProfileId = process.env.JOBS_BOT_PROFILE_ID
      if (!botProfileId) {
        console.error("[jobs/share] JOBS_BOT_PROFILE_ID nao configurado")
        return NextResponse.json({ error: "Bot nao configurado" }, { status: 500 })
      }

      postedBy = botProfileId
    } else {
      const profile = await requireRole("admin", "hr", "mentee")
      postedBy = profile.id
    }

    const body = await request.json()

    const parsed = jobShareSchema.safeParse(body)
    if (!parsed.success) {
      // Log explicito das chaves rejeitadas: o bot trata 400 como falha SEM
      // retry, entao uma dessincronia de contrato perde vagas em silencio. Sem
      // esta linha, so se descobre quando alguem estranha a contagem cair.
      console.error("[jobs/share] payload invalido", {
        fieldErrors: Object.keys(parsed.error.flatten().fieldErrors),
        formErrors: parsed.error.flatten().formErrors,
      })
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.applicationUrl, parsed.data.application_url))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Esta vaga já foi cadastrada com este link." },
        { status: 409 },
      )
    }

    // --- Taxonomia -----------------------------------------------------------
    // Regra que governa este bloco inteiro: ENRIQUECIMENTO NUNCA PODE CUSTAR UMA
    // VAGA. Nenhuma falha aqui pode virar um nao-201; no pior caso a vaga entra
    // sem empresa/stacks vinculadas e o backfill (idempotente) reconcilia.
    let companyId: string | null = null
    try {
      companyId = await resolveJobCompanyId(parsed.data.company, parsed.data.company_url)
    } catch (error) {
      console.error("[jobs/share] falha ao resolver empresa", {
        company: parsed.data.company,
        message: (error as Error).message,
      })
    }

    let location: ReturnType<typeof resolveLocation>
    try {
      location = resolveLocation(parsed.data)
    } catch (error) {
      console.error("[jobs/share] falha ao parsear localidade", {
        message: (error as Error).message,
      })
      location = {
        city: null,
        cityKey: null,
        region: null,
        countryName: null,
        countryCode: null,
        workModelHint: null,
      }
    }

    const stacks = canonicalizeStackTags(parsed.data.stack_tags)

    // O id vem do cliente (padrao de lib/db/sim.ts) para que o insert da vaga e
    // o vinculo das stacks NAO tenham dependencia de dados entre si — so assim
    // as duas escritas cabem num db.batch, que e a unica atomicidade disponivel
    // no driver neon-http (ele nao suporta transacao interativa).
    const jobId = randomUUID()

    const values = {
      id: jobId,
      title: parsed.data.title,
      company: parsed.data.company || null,
      companyId,
      // Campos enriquecidos pelo bot de busca (opcionais). Quando ausentes,
      // caem no default da coluna (stackTags [], jobType "remote").
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      city: location.city,
      cityKey: location.cityKey,
      region: location.region,
      countryName: location.countryName,
      countryCode: location.countryCode,
      stackTags: parsed.data.stack_tags ?? [],
      jobType: parsed.data.job_type ?? location.workModelHint ?? "remote",
      salaryRange: parsed.data.salary_range ?? null,
      requiredLanguage: parsed.data.required_language ?? null,
      languageLevel: parsed.data.language_level ?? null,
      category: parsed.data.category ?? "other",
      recommendationNote: parsed.data.recommendation_note,
      applicationUrl: parsed.data.application_url,
      level: parsed.data.level ?? "junior",
      isInternational: parsed.data.is_international,
      sourcePostedAt: getJobSourcePostedAt(parsed.data.active_hours),
      postedBy,
      status: "pending" as const,
      approvedBy: null,
      approvedAt: null,
    }

    const insertJob = db.insert(jobs).values(values)

    if (stacks.length > 0) {
      try {
        // Atomico no Neon: vaga e vinculos caem juntos ou nenhum dos dois.
        await db.batch([insertJob, buildSyncJobStacksStatement(jobId, stacks)])
      } catch (error) {
        console.error("[jobs/share] batch com stacks falhou, inserindo so a vaga", {
          application_url: parsed.data.application_url,
          message: (error as Error).message,
        })
        await db.insert(jobs).values(values)
      }
    } else {
      await insertJob
    }

    // Releitura em vez de .returning(): db.batch nao devolve as linhas, e o
    // corpo do 201 precisa continuar IDENTICO (o bot le `data`). O select
    // tambem pega os defaults do banco.
    const [data] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1)

    if (!data) {
      console.error("[jobs/share] vaga nao encontrada apos insert", { jobId })
      return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }

    if (postedBy === process.env.JOBS_BOT_PROFILE_ID) {
      console.log("[jobs/share] bot post", {
        application_url: parsed.data.application_url,
        company_id: companyId,
        country_code: location.countryCode,
        stacks: stacks.length,
        ip: getClientIp(request),
      })
    }

    return NextResponse.json({ data: toJob(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
