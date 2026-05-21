import { google } from "googleapis"
import { eq } from "drizzle-orm"
import { db, siteSettings } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"

function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar credentials not configured")
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

async function getRefreshToken() {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return process.env.GOOGLE_REFRESH_TOKEN
  }

  try {
    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "google_calendar"))
      .limit(1)

    const dbToken = (setting?.value as { refresh_token?: string } | undefined)?.refresh_token
    if (dbToken) return dbToken
  } catch {
    // Fall back to Supabase settings below for older installations.
  }

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "google_calendar")
      .single()

    return (data?.value as { refresh_token?: string } | undefined)?.refresh_token || null
  } catch {
    return null
  }
}

/**
 * Gera URL de consentimento OAuth para o admin conectar Google Calendar.
 */
export function getConsentUrl(redirectUri: string): string {
  const oauth2 = getOAuth2Client(redirectUri)

  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  })
}

/**
 * Troca o authorization code por tokens (inclui refresh_token).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
) {
  const oauth2 = getOAuth2Client(redirectUri)

  const { tokens } = await oauth2.getToken(code)
  return tokens
}

/**
 * Cria um evento no Google Calendar com Google Meet.
 * Retorna o event ID e o link do Google Meet.
 */
export async function createCalendarEvent(params: {
  summary: string
  description: string
  date: string // "YYYY-MM-DD"
  time: string // "HH:MM"
  attendeeEmail?: string
  durationMinutes?: number
}): Promise<{ eventId: string; meetLink: string | null } | null> {
  const refreshToken = await getRefreshToken()
  const calendarId =
    process.env.GOOGLE_CALENDAR_ID || "primary"

  if (!refreshToken) {
    console.warn("[calendar] No refresh token configured, skipping")
    return null
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  const duration = params.durationMinutes || 60
  const startDateTime = `${params.date}T${params.time}:00`
  const startDate = new Date(startDateTime)
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

  const attendees = [
    { email: process.env.GOOGLE_CALENDAR_ID || "adrianomonteiroweb@gmail.com" },
  ]

  if (params.attendeeEmail) {
    attendees.push({ email: params.attendeeEmail })
  }

  const event = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Fortaleza",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Fortaleza",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `mentoria-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    },
  })

  if (!event.data.id) return null

  const meetLink =
    event.data.hangoutLink ||
    event.data.conferenceData?.entryPoints?.find(
      (entryPoint) => entryPoint.entryPointType === "video",
    )?.uri ||
    null

  return {
    eventId: event.data.id,
    meetLink,
  }
}

/**
 * Deleta um evento do Google Calendar.
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const refreshToken = await getRefreshToken()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"

  if (!refreshToken) return

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  try {
    await calendar.events.delete({ calendarId, eventId })
  } catch (error) {
    console.error("[calendar] Delete error:", error)
  }
}
