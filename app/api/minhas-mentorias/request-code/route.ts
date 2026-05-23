import { randomInt } from "crypto"
import bcrypt from "bcryptjs"
import { and, desc, eq, gt, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { bookings, db, menteeAccessCodes, profiles } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { accessCodeEmail } from "@/lib/email-templates"
import { normalizeEmail } from "@/lib/utils/mentee-access"

const CODE_TTL_MINUTES = 15
const RATE_LIMIT_SECONDS = 60

const schema = z.object({
  email: z.string().email("Email inválido"),
})

async function emailHasMentorship(email: string): Promise<boolean> {
  const [profileRow] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1)

  if (profileRow) return true

  const [bookingRow] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.guestEmail, email))
    .limit(1)

  return Boolean(bookingRow)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const email = normalizeEmail(parsed.data.email)

    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000)
    const [recentCode] = await db
      .select({ createdAt: menteeAccessCodes.createdAt })
      .from(menteeAccessCodes)
      .where(
        and(
          eq(menteeAccessCodes.email, email),
          isNull(menteeAccessCodes.usedAt),
          gt(menteeAccessCodes.createdAt, rateLimitCutoff),
        ),
      )
      .orderBy(desc(menteeAccessCodes.createdAt))
      .limit(1)

    if (recentCode) {
      return NextResponse.json({ success: true })
    }

    const hasMentorship = await emailHasMentorship(email)

    if (hasMentorship) {
      const code = String(randomInt(100000, 1000000))
      const codeHash = await bcrypt.hash(code, 10)
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)

      await db.insert(menteeAccessCodes).values({
        email,
        codeHash,
        expiresAt,
      })

      const { subject, html } = accessCodeEmail({
        code,
        minutesValid: CODE_TTL_MINUTES,
      })

      await sendEmail({ to: email, subject, html })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[minhas-mentorias/request-code] Error:", error)
    return NextResponse.json({ success: true })
  }
}
