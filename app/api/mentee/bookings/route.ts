import { NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { db, bookings, mentoringTopics } from "@/lib/db"
import { requireAuth } from "@/lib/utils/auth"

export async function GET() {
  try {
    const user = await requireAuth()

    const rows = await db
      .select({
        id: bookings.id,
        sessionDate: bookings.sessionDate,
        startTime: bookings.startTime,
        bookingType: bookings.bookingType,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        topicName: mentoringTopics.name,
      })
      .from(bookings)
      .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
      .where(eq(bookings.menteeId, user.id))
      .orderBy(desc(bookings.createdAt))

    const data = rows.map((r) => ({
      id: r.id,
      session_date: r.sessionDate,
      start_time: r.startTime,
      booking_type: r.bookingType,
      status: r.status,
      notes: r.notes,
      created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      mentoring_topics: r.topicName ? { name: r.topicName } : null,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
