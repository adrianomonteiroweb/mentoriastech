import { NextResponse } from "next/server"
import { and, count, desc, eq, gte, lte } from "drizzle-orm"
import { bookings, db, mentoringSlots, mentoringTopics, profiles } from "@/lib/db"
import {
  bookingSelect,
  isMissingMentorshipChecklistColumnError,
} from "@/lib/db/booking-select"
import {
  toBooking,
  toMentoringSlot,
  toMentoringTopic,
  toProfile,
} from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { z } from "zod"
import type { BookingStatus, BookingType } from "@/lib/types/database"

const BOOKING_TYPES: BookingType[] = ["free", "paid", "private"]

const mentorshipChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  checked: z.boolean(),
})

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
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const bookingId = searchParams.get("booking_id")

    const menteeId = searchParams.get("mentee_id")

    const filters = []
    if (bookingId && z.string().uuid().safeParse(bookingId).success) {
      filters.push(eq(bookings.id, bookingId))
    }
    if (status) filters.push(eq(bookings.status, status))
    if (type) filters.push(eq(bookings.bookingType, type))
    if (menteeId) filters.push(eq(bookings.menteeId, menteeId))
    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      filters.push(gte(bookings.sessionDate, dateFrom))
    }
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      filters.push(lte(bookings.sessionDate, dateTo))
    }
    const where = filters.length ? and(...filters) : undefined

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          booking: bookingSelect,
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

const createSchema = z.object({
  mentee_id: z.string().uuid(),
  topic_id: z.string().uuid().optional().or(z.literal("")),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  booking_type: z.enum(["free", "paid", "private"]).default("free"),
  status: z.enum(["pending", "confirmed", "payment_pending", "paid", "scheduled", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().optional(),
  topics_discussed: z.string().optional(),
  mentee_strengths: z.string().optional(),
  mentee_growth_areas: z.string().optional(),
  admin_notes: z.string().optional(),
  mentorship_checklist: z.array(mentorshipChecklistItemSchema).optional(),
})

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const startTime = parsed.data.start_time
      ? parsed.data.start_time.length === 5
        ? `${parsed.data.start_time}:00`
        : parsed.data.start_time
      : null

    const insertData: typeof bookings.$inferInsert = {
      menteeId: parsed.data.mentee_id,
      topicId: parsed.data.topic_id || null,
      sessionDate: parsed.data.session_date,
      startTime: startTime,
      bookingType: parsed.data.booking_type,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      topicsDiscussed: parsed.data.topics_discussed || null,
      menteeStrengths: parsed.data.mentee_strengths || null,
      menteeGrowthAreas: parsed.data.mentee_growth_areas || null,
      adminNotes: parsed.data.admin_notes || null,
    }

    if (parsed.data.mentorship_checklist !== undefined) {
      insertData.mentorshipChecklist = parsed.data.mentorship_checklist
    }

    let data
    try {
      ;[data] = await db
        .insert(bookings)
        .values(insertData)
        .returning(bookingSelect)
    } catch (error) {
      if (!isMissingMentorshipChecklistColumnError(error)) throw error

      delete insertData.mentorshipChecklist
      ;[data] = await db
        .insert(bookings)
        .values(insertData)
        .returning(bookingSelect)
    }

    return NextResponse.json({ data: toBooking(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
