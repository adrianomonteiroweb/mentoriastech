import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { db, menteeAccessSessions } from "@/lib/db"

export const MENTEE_ACCESS_COOKIE = "mentee_access_session"
export const SESSION_TTL_DAYS = 7

export interface MenteeAccessSession {
  id: string
  email: string
}

export async function getMenteeAccessSession(): Promise<MenteeAccessSession | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(MENTEE_ACCESS_COOKIE)?.value
  if (!sessionId) return null

  const [row] = await db
    .select()
    .from(menteeAccessSessions)
    .where(
      and(
        eq(menteeAccessSessions.id, sessionId),
        gt(menteeAccessSessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) return null

  return { id: row.id, email: row.email }
}

export async function requireMenteeAccess(): Promise<MenteeAccessSession> {
  const session = await getMenteeAccessSession()
  if (!session) {
    throw new MenteeAccessError("Sessao expirada ou invalida", 401)
  }
  return session
}

export class MenteeAccessError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "MenteeAccessError"
    this.status = status
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
