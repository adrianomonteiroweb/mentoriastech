import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { db, siteSettings } from "@/lib/db"
import {
  MENTORSHIP_CHECKLIST_SETTING_KEY,
  normalizeMentorshipChecklistConfig,
} from "@/lib/mentorship-checklist"
import {
  RESUME_AI_PROMPT_SETTING_KEY,
  normalizeResumeAiPrompt,
} from "@/lib/resume-ai-prompt"
import {
  LINKEDIN_AI_PROMPT_SETTING_KEY,
  normalizeLinkedinAiPrompt,
} from "@/lib/linkedin-ai-prompt"

const GOOGLE_CALENDAR_SETTING_KEY = "google_calendar"
const ADMIN_MUTABLE_SETTINGS = new Set([
  "pix_config",
  MENTORSHIP_CHECKLIST_SETTING_KEY,
  RESUME_AI_PROMPT_SETTING_KEY,
  LINKEDIN_AI_PROMPT_SETTING_KEY,
])

function redactSettingValue(key: string, value: unknown) {
  if (key !== GOOGLE_CALENDAR_SETTING_KEY) return value

  const calendar = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return {
    is_connected: calendar.is_connected === true || typeof calendar.refresh_token === "string",
    connected_at: typeof calendar.connected_at === "string" ? calendar.connected_at : null,
  }
}

export async function GET() {
  try {
    await requireRole("admin")
    const data = await db.select().from(siteSettings)

    // Converter array em objeto key-value
    const settings = Object.fromEntries(
      data.map((s) => [s.key, redactSettingValue(s.key, s.value)]),
    )

    if (!settings[MENTORSHIP_CHECKLIST_SETTING_KEY]) {
      settings[MENTORSHIP_CHECKLIST_SETTING_KEY] = normalizeMentorshipChecklistConfig(null)
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key e value sao obrigatorios" }, { status: 400 })
    }

    if (key === GOOGLE_CALENDAR_SETTING_KEY || !ADMIN_MUTABLE_SETTINGS.has(key)) {
      return NextResponse.json({ error: "Configuracao nao pode ser alterada por este endpoint" }, { status: 400 })
    }

    const nextValue =
      key === MENTORSHIP_CHECKLIST_SETTING_KEY
        ? normalizeMentorshipChecklistConfig(value, false)
        : key === RESUME_AI_PROMPT_SETTING_KEY
          ? normalizeResumeAiPrompt(value)
          : key === LINKEDIN_AI_PROMPT_SETTING_KEY
            ? normalizeLinkedinAiPrompt(value)
            : value

    const [data] = await db
      .insert(siteSettings)
      .values({ key, value: nextValue, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: nextValue, updatedAt: new Date() },
      })
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Configuracao nao foi salva" }, { status: 500 })
    }

    return NextResponse.json({ data: { ...data, value: redactSettingValue(data.key, data.value) } })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
