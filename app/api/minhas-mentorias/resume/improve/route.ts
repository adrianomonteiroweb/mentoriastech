import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { improveResume, ResumeAIError } from "@/lib/ai/gemini"
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

const schema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(20, "Descreva a vaga com mais detalhes (mínimo 20 caracteres).")
    .max(8000, "Descrição muito longa (máximo 8000 caracteres)."),
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

    const markdown = await improveResume({
      pdfBase64,
      jobDescription: parsed.data.jobDescription,
      customPrompt,
    })

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "resume_ai_improved",
      route: new URL(request.url).pathname,
      request,
      metadata: { jobDescriptionLength: parsed.data.jobDescription.length },
    })

    return NextResponse.json({ markdown })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
