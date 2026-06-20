import { NextResponse } from "next/server"
import { and, eq, or, sql } from "drizzle-orm"
import { db, bookings, bookingTasks, mentoringTopics, profiles } from "@/lib/db"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"

export async function GET() {
  const session = await getMenteeAccessSession()
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }

  const normalized = session.email.trim().toLowerCase()

  const rows = await db
    .select({
      taskId: bookingTasks.id,
      taskTitle: bookingTasks.title,
      taskCompleted: bookingTasks.completed,
      bookingId: bookings.id,
      topicName: mentoringTopics.name,
      sessionDate: bookings.sessionDate,
    })
    .from(bookingTasks)
    .innerJoin(bookings, eq(bookingTasks.bookingId, bookings.id))
    .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .where(
      and(
        eq(bookingTasks.completed, false),
        or(
          eq(bookings.guestEmail, normalized),
          eq(profiles.email, normalized),
        ),
        sql`${bookings.status} != 'cancelled'`,
      ),
    )
    .orderBy(bookingTasks.sortOrder, bookingTasks.createdAt)
    .limit(10)

  return NextResponse.json({ data: rows })
}
