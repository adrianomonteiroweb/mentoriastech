import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import {
  getConsentUrl,
  exchangeCodeForTokens,
  getConnectedEmail,
  getCalendarRedirectUri,
  googleCalendarSettingKey,
} from "@/lib/google-calendar"
import { db, sitePrivateSettings } from "@/lib/db"

function settingsPathForRole(role: string) {
  return role === "mentor" ? "/mentor/settings" : "/admin/settings"
}

async function storeMentorCredentials(
  mentorId: string,
  refreshToken: string,
  calendarEmail: string | null,
) {
  const key = googleCalendarSettingKey(mentorId)
  const value = {
    refresh_token: refreshToken,
    calendar_email: calendarEmail,
    connected_at: new Date().toISOString(),
  }

  await db
    .insert(sitePrivateSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: sitePrivateSettings.key,
      set: { value, updatedAt: new Date() },
    })
}

// GET: gera URL de consentimento OU processa o callback do Google (?code=)
export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const oauthError = url.searchParams.get("error")
    const redirectUri = getCalendarRedirectUri(url.origin)

    // Callback do Google: troca o code e salva o token do mentor da sessão.
    if (code || oauthError) {
      const settingsPath = settingsPathForRole(profile.role)

      if (oauthError) {
        return NextResponse.redirect(new URL(`${settingsPath}?calendar=error`, url.origin))
      }

      try {
        const tokens = await exchangeCodeForTokens(code as string, redirectUri)

        if (!tokens.refresh_token) {
          return NextResponse.redirect(
            new URL(`${settingsPath}?calendar=norefresh`, url.origin),
          )
        }

        const calendarEmail = await getConnectedEmail(tokens)
        await storeMentorCredentials(getMentorId(profile), tokens.refresh_token, calendarEmail)

        return NextResponse.redirect(new URL(`${settingsPath}?calendar=connected`, url.origin))
      } catch (callbackError) {
        console.error("[calendar auth] callback error:", callbackError)
        return NextResponse.redirect(new URL(`${settingsPath}?calendar=error`, url.origin))
      }
    }

    const consentUrl = getConsentUrl(redirectUri)
    return NextResponse.json({ url: consentUrl, redirect_uri: redirectUri })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// POST: troca code por tokens e salva refresh_token (uso programático)
export async function POST(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const { code } = await request.json()
    const { origin } = new URL(request.url)
    const redirectUri = getCalendarRedirectUri(origin)

    if (!code) {
      return NextResponse.json({ error: "Code obrigatorio" }, { status: 400 })
    }

    const tokens = await exchangeCodeForTokens(code, redirectUri)

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "Nenhum refresh_token retornado. Tente revogar o acesso em myaccount.google.com e reconectar." },
        { status: 400 },
      )
    }

    const calendarEmail = await getConnectedEmail(tokens)
    await storeMentorCredentials(getMentorId(profile), tokens.refresh_token, calendarEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[calendar auth] Error:", error)
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro ao conectar Google Calendar"
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE: desconecta o Google Calendar do mentor da sessão
export async function DELETE(request: Request) {
  try {
    const profile = await requireMentorAccess()

    await db
      .delete(sitePrivateSettings)
      .where(eq(sitePrivateSettings.key, googleCalendarSettingKey(getMentorId(profile))))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro ao desconectar Google Calendar"
    return NextResponse.json({ error: message }, { status })
  }
}
