import { google } from "googleapis"
import { eq } from "drizzle-orm"
import { db, sitePrivateSettings, siteSettings } from "@/lib/db"
import { getDefaultMentorId } from "@/lib/utils/auth"

/**
 * Chave usada em site_settings/site_private_settings para a integração do
 * Google Calendar de um mentor específico.
 */
export function googleCalendarSettingKey(mentorId: string): string {
  return `google_calendar:${mentorId}`
}

function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar credentials not configured")
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export interface MentorCalendarCredentials {
  refreshToken: string
  calendarEmail: string | null
}

async function readPrivateSetting(key: string) {
  try {
    const [setting] = await db
      .select()
      .from(sitePrivateSettings)
      .where(eq(sitePrivateSettings.key, key))
      .limit(1)

    return setting?.value as
      | { refresh_token?: string; calendar_email?: string }
      | undefined
  } catch {
    // Instalações que ainda não aplicaram a migração de private settings.
    return undefined
  }
}

/**
 * Token global legado (env ou chave única "google_calendar"). Mantido apenas
 * como fallback para o admin padrão, para não quebrar conexões existentes.
 */
async function getLegacyRefreshToken(): Promise<string | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return process.env.GOOGLE_REFRESH_TOKEN
  }

  const priv = await readPrivateSetting("google_calendar")
  if (priv?.refresh_token) return priv.refresh_token

  try {
    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "google_calendar"))
      .limit(1)

    const dbToken = (setting?.value as { refresh_token?: string } | undefined)?.refresh_token
    if (dbToken) return dbToken
  } catch {
    // Fallback para instalações antigas sem a coluna/registro.
  }

  return null
}

/**
 * Resolve as credenciais do Google Calendar de um mentor.
 * Procura primeiro a chave por mentor; se não houver, usa a conexão global
 * legada apenas quando o mentor é o admin padrão.
 */
async function getMentorCalendarCredentials(
  mentorId: string,
): Promise<MentorCalendarCredentials | null> {
  const perMentor = await readPrivateSetting(googleCalendarSettingKey(mentorId))
  if (perMentor?.refresh_token) {
    return {
      refreshToken: perMentor.refresh_token,
      calendarEmail: perMentor.calendar_email ?? null,
    }
  }

  try {
    const defaultMentorId = await getDefaultMentorId()
    if (mentorId === defaultMentorId) {
      const legacy = await getLegacyRefreshToken()
      if (legacy) {
        return {
          refreshToken: legacy,
          calendarEmail: process.env.GOOGLE_CALENDAR_ID ?? null,
        }
      }
    }
  } catch {
    // Sem admin configurado — sem fallback.
  }

  return null
}

/**
 * Indica se um mentor tem o Google Calendar conectado (sem expor o token).
 */
export async function isMentorCalendarConnected(mentorId: string): Promise<boolean> {
  return (await getMentorCalendarCredentials(mentorId)) !== null
}

/**
 * Resolve a redirect URI do OAuth. Prioriza GOOGLE_REDIRECT_URI (valor fixo,
 * idêntico ao registrado no Google Cloud Console) para evitar mismatch quando
 * o app roda atrás de proxy/Vercel e o `origin` da request não bate com o
 * domínio público. Sem a env, usa o origin da request como fallback.
 *
 * IMPORTANTE: a string retornada precisa estar cadastrada em
 * "URIs de redirecionamento autorizados" no Google Cloud Console.
 */
export function getCalendarRedirectUri(requestOrigin: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (configured) return configured
  return `${requestOrigin}/api/admin/calendar/auth`
}

/**
 * Gera URL de consentimento OAuth para o mentor conectar Google Calendar.
 */
export function getConsentUrl(redirectUri: string): string {
  const oauth2 = getOAuth2Client(redirectUri)

  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
    ],
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
 * Descobre o e-mail da conta Google conectada a partir dos tokens.
 */
export async function getConnectedEmail(tokens: {
  access_token?: string | null
  refresh_token?: string | null
  id_token?: string | null
}): Promise<string | null> {
  try {
    const oauth2 = getOAuth2Client()
    oauth2.setCredentials(tokens)
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 })
    const { data } = await oauth2Api.userinfo.get()
    return data.email ?? null
  } catch (error) {
    console.error("[calendar] Failed to fetch connected email:", error)
    return null
  }
}

/**
 * Cria um evento no Google Calendar (do mentor) com Google Meet.
 * Retorna o event ID e o link do Google Meet, ou null se o mentor não conectou.
 */
export async function createCalendarEvent(params: {
  mentorId: string
  summary: string
  description: string
  date: string // "YYYY-MM-DD"
  time: string // "HH:MM"
  attendeeEmail?: string
  durationMinutes?: number
}): Promise<{ eventId: string; meetLink: string | null } | null> {
  const credentials = await getMentorCalendarCredentials(params.mentorId)

  if (!credentials) {
    console.warn("[calendar] No refresh token configured for mentor, skipping")
    return null
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({ refresh_token: credentials.refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  const duration = params.durationMinutes || 60
  const startDateTime = `${params.date}T${params.time}:00`
  const startDate = new Date(startDateTime)
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

  // O organizador é a própria conta conectada (calendário "primary").
  const attendees = params.attendeeEmail ? [{ email: params.attendeeEmail }] : []

  const event = await calendar.events.insert({
    calendarId: "primary",
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
 * Deleta um evento do Google Calendar do mentor.
 */
export async function deleteCalendarEvent(params: {
  mentorId: string
  eventId: string
}): Promise<void> {
  const credentials = await getMentorCalendarCredentials(params.mentorId)
  if (!credentials) return

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({ refresh_token: credentials.refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  try {
    await calendar.events.delete({ calendarId: "primary", eventId: params.eventId })
  } catch (error) {
    console.error("[calendar] Delete error:", error)
  }
}
