import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db, sessions } from "@/lib/db"
import { SESSION_COOKIE } from "@/lib/utils/auth"

export async function POST() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }

  cookieStore.delete(SESSION_COOKIE)

  return NextResponse.json({ success: true })
}
