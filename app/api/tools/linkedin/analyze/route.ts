import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings } from "@/lib/db"
import { analyzeLinkedInProfile, ResumeAIError } from "@/lib/ai/gemini"
import {
  LINKEDIN_AI_PROMPT_SETTING_KEY,
  normalizeLinkedinAiPrompt,
} from "@/lib/linkedin-ai-prompt"
import { UploadError, validateUploadedFile } from "@/lib/utils/upload"
import { enforceToolRateLimit } from "@/lib/utils/tool-rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const dataSchema = z.object({
  careerGoal: z
    .string()
    .trim()
    .min(10, "Descreva seu foco profissional com mais detalhes (mínimo 10 caracteres).")
    .max(2000, "Texto muito longo (máximo 2000 caracteres)."),
  profileLanguage: z.enum(["portugues", "ingles", "espanhol", "outro"]),
  recommendations: z.enum(["nenhuma", "1-3", "4-10", "mais-de-10"]),
  publishingFrequency: z.enum(["nunca", "raramente", "mensalmente", "semanalmente"]),
  connections: z.enum(["menos-de-100", "100-500", "500-1000", "mais-de-1000"]),
  mainSkills: z
    .string()
    .trim()
    .min(3, "Informe pelo menos uma área de atuação.")
    .max(1000, "Texto muito longo (máximo 1000 caracteres)."),
  trajectory: z
    .array(
      z.object({
        year: z.string().max(9),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .max(30)
    .optional(),
})

export async function POST(request: Request) {
  try {
    await enforceToolRateLimit(request, "linkedin_analyze", 5)

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie o PDF do seu perfil LinkedIn." },
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
      .where(eq(siteSettings.key, LINKEDIN_AI_PROMPT_SETTING_KEY))
      .limit(1)
    const customPrompt = normalizeLinkedinAiPrompt(setting?.value)

    const analysis = await analyzeLinkedInProfile({
      pdfBase64,
      careerGoal: parsed.data.careerGoal,
      profileLanguage: parsed.data.profileLanguage,
      recommendations: parsed.data.recommendations,
      publishingFrequency: parsed.data.publishingFrequency,
      connections: parsed.data.connections,
      mainSkills: parsed.data.mainSkills,
      trajectory: parsed.data.trajectory,
      customPrompt,
    })

    return NextResponse.json({ score: analysis.score, checklist: analysis.checklist })
  } catch (error) {
    if (error instanceof ResumeAIError || error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
