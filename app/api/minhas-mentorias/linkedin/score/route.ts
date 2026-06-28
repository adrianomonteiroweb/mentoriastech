import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, siteSettings } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { scoreLinkedInProfile, ResumeAIError } from "@/lib/ai/gemini"
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

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()

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

    const result = await scoreLinkedInProfile({ pdfBase64, customPrompt })

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "linkedin_ai_scored",
      route: new URL(request.url).pathname,
      request,
      metadata: { score: result.score },
    })

    return NextResponse.json({ score: result.score, checklist: result.checklist })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
