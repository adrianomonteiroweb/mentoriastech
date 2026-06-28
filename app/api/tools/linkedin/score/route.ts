import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, siteSettings } from "@/lib/db"
import { scoreLinkedInProfile, ResumeAIError } from "@/lib/ai/gemini"
import {
  LINKEDIN_AI_PROMPT_SETTING_KEY,
  normalizeLinkedinAiPrompt,
} from "@/lib/linkedin-ai-prompt"
import { UploadError, validateUploadedFile } from "@/lib/utils/upload"
import { enforceToolRateLimit } from "@/lib/utils/tool-rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await enforceToolRateLimit(request, "linkedin_score", 10)

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie o PDF do seu perfil LinkedIn." },
        { status: 400 },
      )
    }
    await validateUploadedFile(file)

    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64")

    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, LINKEDIN_AI_PROMPT_SETTING_KEY))
      .limit(1)
    const customPrompt = normalizeLinkedinAiPrompt(setting?.value)

    const result = await scoreLinkedInProfile({ pdfBase64, customPrompt })

    return NextResponse.json({ score: result.score, checklist: result.checklist })
  } catch (error) {
    if (error instanceof ResumeAIError || error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
