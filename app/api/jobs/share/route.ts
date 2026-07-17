import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { getJobSourcePostedAt } from "@/lib/job-active-time"
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

    const [data] = await db
      .insert(jobs)
      .values({
        title: parsed.data.title,
        company: parsed.data.company || null,
        // Campos enriquecidos pelo bot de busca (opcionais). Quando ausentes,
        // caem no default da coluna (stackTags [], jobType "remote").
        description: parsed.data.description ?? null,
        location: parsed.data.location ?? null,
        stackTags: parsed.data.stack_tags ?? [],
        jobType: parsed.data.job_type ?? "remote",
        salaryRange: parsed.data.salary_range ?? null,
        requiredLanguage: parsed.data.required_language ?? null,
        languageLevel: parsed.data.language_level ?? null,
        recommendationNote: parsed.data.recommendation_note,
        applicationUrl: parsed.data.application_url,
        level: parsed.data.level ?? "junior",
        isInternational: parsed.data.is_international,
        sourcePostedAt: getJobSourcePostedAt(parsed.data.active_hours),
        postedBy,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      })
      .returning()

    if (postedBy === process.env.JOBS_BOT_PROFILE_ID) {
      console.log("[jobs/share] bot post", {
        application_url: parsed.data.application_url,
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
