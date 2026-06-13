import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { db, paidMentorships } from "@/lib/db"
import { toPublicPaidMentorship } from "@/lib/db/mappers"
import {
  isPaidMentorshipsMissingError,
  PAID_MENTORSHIPS_MIGRATION_ERROR,
} from "@/lib/paid-mentorships"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorId = searchParams.get("mentorId")

    const filters = [eq(paidMentorships.isActive, true)]
    if (mentorId) filters.push(eq(paidMentorships.mentorId, mentorId))

    const rows = await db
      .select()
      .from(paidMentorships)
      .where(and(...filters))
      .orderBy(asc(paidMentorships.sortOrder), asc(paidMentorships.createdAt))

    return NextResponse.json({ data: rows.map(toPublicPaidMentorship) })
  } catch (error) {
    if (isPaidMentorshipsMissingError(error)) {
      return NextResponse.json({ error: PAID_MENTORSHIPS_MIGRATION_ERROR }, { status: 500 })
    }

    console.error("[paid-mentorships] Error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar mentorias pagas" },
      { status: 500 },
    )
  }
}
