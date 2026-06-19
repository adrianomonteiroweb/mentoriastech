import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, sitePrivateSettings } from "@/lib/db"
import {
  getCalendarRedirectUri,
  googleCalendarSettingKey,
  isMentorCalendarConnected,
} from "@/lib/google-calendar"

// GET: status da integração Google Calendar do mentor da sessão (sem token)
export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const redirectUri = getCalendarRedirectUri(new URL(request.url).origin)

    const [setting] = await db
      .select()
      .from(sitePrivateSettings)
      .where(eq(sitePrivateSettings.key, googleCalendarSettingKey(mentorId)))
      .limit(1)

    const value = setting?.value as
      | { refresh_token?: string; calendar_email?: string; connected_at?: string }
      | undefined

    if (value?.refresh_token) {
      return NextResponse.json({
        connected: true,
        email: value.calendar_email ?? null,
        connected_at: value.connected_at ?? null,
        redirect_uri: redirectUri,
      })
    }

    // Cobre o fallback global legado (admin padrão).
    const connected = await isMentorCalendarConnected(mentorId)
    return NextResponse.json({
      connected,
      email: null,
      connected_at: null,
      redirect_uri: redirectUri,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
