import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import {
  evaluateRequirements,
  improveResume,
  ResumeAIError,
} from "@/lib/ai/gemini"
import {
  RESUME_AI_PROMPT_SETTING_KEY,
  normalizeResumeAiPrompt,
} from "@/lib/resume-ai-prompt"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { getPrivateFile } from "@/lib/utils/upload"
import { getProfileByEmail, usableResumePathname } from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const requirementSchema = z.object({
  skill: z.string(),
  kind: z.enum(["essential", "differential"]),
  evidence: z.enum(["strong", "weak", "missing"]),
})

const evidenceAnswerSchema = z.object({
  skill: z.string(),
  answer: z.string(),
  results: z.string().optional(),
})

const trajectoryTopicSchema = z.object({
  year: z.string(),
  text: z.string(),
})

const schema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(20, "Descreva a vaga com mais detalhes (mínimo 20 caracteres).")
    .max(8000, "Descrição muito longa (máximo 8000 caracteres)."),
  requirements: z.array(requirementSchema).optional(),
  evidenceAnswers: z.array(evidenceAnswerSchema).optional(),
  trajectory: z.array(trajectoryTopicSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const profile = await getProfileByEmail(session.email)
    const pathname = usableResumePathname(profile?.resumeUrl)
    if (!profile || !pathname) {
      return NextResponse.json(
        { error: "Envie um currículo em PDF antes de gerar a versão otimizada." },
        { status: 400 },
      )
    }

    const file = await getPrivateFile(pathname)
    if (!file || !file.stream) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }

    const arrayBuffer = await new Response(file.stream).arrayBuffer()
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64")

    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, RESUME_AI_PROMPT_SETTING_KEY))
      .limit(1)
    const customPrompt = normalizeResumeAiPrompt(setting?.value)

    const { resume: markdown, suggestions } = await improveResume({
      pdfBase64,
      jobDescription: parsed.data.jobDescription,
      customPrompt,
      requirements: parsed.data.requirements,
      evidenceAnswers: parsed.data.evidenceAnswers,
      trajectory: parsed.data.trajectory,
    })

    // Reavaliação por requisitos do currículo gerado — não bloqueia a entrega.
    let compatibilityAfter: number | null = null
    let requirementsAfter: typeof parsed.data.requirements | null = null
    if (parsed.data.requirements && parsed.data.requirements.length > 0) {
      try {
        const evaluated = await evaluateRequirements({
          jobDescription: parsed.data.jobDescription,
          resumeText: markdown,
          requirements: parsed.data.requirements,
        })
        compatibilityAfter = evaluated.score
        requirementsAfter = evaluated.requirements
      } catch (scoreError) {
        console.error("[resume] requirements eval error (non-blocking):", scoreError)
      }
    }

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "resume_ai_improved",
      route: new URL(request.url).pathname,
      request,
      metadata: { jobDescriptionLength: parsed.data.jobDescription.length },
    })

    return NextResponse.json({ markdown, suggestions, compatibilityAfter, requirementsAfter })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
