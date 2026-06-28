import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings } from "@/lib/db"
import {
  evaluateRequirements,
  improveResume,
  ResumeAIError,
} from "@/lib/ai/gemini"
import {
  RESUME_AI_PROMPT_SETTING_KEY,
  normalizeResumeAiPrompt,
} from "@/lib/resume-ai-prompt"
import { UploadError, validateUploadedFile } from "@/lib/utils/upload"
import { enforceToolRateLimit } from "@/lib/utils/tool-rate-limit"

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

const dataSchema = z.object({
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
    await enforceToolRateLimit(request, "resume_improve", 5)

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie o PDF do seu currículo." },
        { status: 400 },
      )
    }
    await validateUploadedFile(file)

    let data: unknown
    try {
      data = JSON.parse(String(formData.get("data") ?? "{}"))
    } catch {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }
    const parsed = dataSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64")

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
        console.error("[tools/resume] eval error (non-blocking):", scoreError)
      }
    }

    return NextResponse.json({
      markdown,
      suggestions,
      compatibilityAfter,
      requirementsAfter,
    })
  } catch (error) {
    if (error instanceof ResumeAIError || error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
