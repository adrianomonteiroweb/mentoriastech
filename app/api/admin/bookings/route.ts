import { NextResponse } from "next/server"
import { and, count, desc, eq } from "drizzle-orm"
import { bookings, db, mentoringSlots, mentoringTopics, profiles } from "@/lib/db"
import {
  toBooking,
  toMentoringSlot,
  toMentoringTopic,
  toProfile,
} from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import type { BookingStatus, BookingType } from "@/lib/types/database"

const BOOKING_TYPES: BookingType[] = ["free", "paid", "private"]

export async function GET(request: Request) {
  try {
    await requireRole("admin")
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status") as BookingStatus | null
    const typeParam = searchParams.get("type")
    const type = BOOKING_TYPES.includes(typeParam as BookingType)
      ? (typeParam as BookingType)
      : null
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    const filters = []
    if (status) filters.push(eq(bookings.status, status))
    if (type) filters.push(eq(bookings.bookingType, type))
    const where = filters.length ? and(...filters) : undefined

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          booking: bookings,
          topic: mentoringTopics,
          slot: mentoringSlots,
          profile: profiles,
        })
        .from(bookings)
        .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
        .leftJoin(mentoringSlots, eq(bookings.slotId, mentoringSlots.id))
        .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(bookings).where(where),
    ])

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toBooking(row.booking),
        mentoring_topics: row.topic ? toMentoringTopic(row.topic) : null,
        mentoring_slots: row.slot ? toMentoringSlot(row.slot) : null,
        profiles: row.profile ? toProfile(row.profile) : null,
      })),
      total: totalRows[0]?.value || 0,
      page,
      pageSize,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
