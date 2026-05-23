import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { db, menteeAccessSessions } from "@/lib/db"
import { MENTEE_ACCESS_COOKIE } from "@/lib/utils/mentee-access"

export async function POST() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(MENTEE_ACCESS_COOKIE)?.value

  if (sessionId) {
    try {
      await db.delete(menteeAccessSessions).where(eq(menteeAccessSessions.id, sessionId))
    } catch (error) {
      console.error("[minhas-mentorias/logout] Error:", error)
    }
  }

  cookieStore.delete(MENTEE_ACCESS_COOKIE)
  return NextResponse.json({ success: true })
}
