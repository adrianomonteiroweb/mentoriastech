import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { analyzeLinkedInProfile, ResumeAIError } from "@/lib/ai/gemini"
import {
  LINKEDIN_AI_PROMPT_SETTING_KEY,
  normalizeLinkedinAiPrompt,
} from "@/lib/linkedin-ai-prompt"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { getPrivateFile } from "@/lib/utils/upload"
import { getProfileByEmail } from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const schema = z.object({
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
    const pathname = profile?.linkedinPdfUrl
    if (!profile || !pathname || !pathname.startsWith("private/linkedin/")) {
      return NextResponse.json(
        { error: "Envie o PDF do seu perfil LinkedIn antes de usar a ferramenta." },
        { status: 400 },
      )
    }

    const file = await getPrivateFile(pathname)
    if (!file || !file.stream) {
      return NextResponse.json({ error: "PDF do LinkedIn não encontrado" }, { status: 404 })
    }

    const arrayBuffer = await new Response(file.stream as ReadableStream).arrayBuffer()
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64")

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
      customPrompt,
    })

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "linkedin_ai_analyzed",
      route: new URL(request.url).pathname,
      request,
      metadata: { careerGoalLength: parsed.data.careerGoal.length },
    })

    return NextResponse.json({ analysis })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
