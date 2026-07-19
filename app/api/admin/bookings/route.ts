import { NextResponse } from "next/server"
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm"
import { bookings, db, mentoringSlots, mentoringTopics, paidMentorships, profiles } from "@/lib/db"
import {
  bookingSelect,
  isOptionalBookingMetadataPersistenceError,
} from "@/lib/db/booking-select"
import {
  toBooking,
  toMentoringSlot,
  toMentoringTopic,
  toPublicPaidMentorship,
  toProfile,
} from "@/lib/db/mappers"
import { normalizeMentorshipChecklistSnapshot } from "@/lib/mentorship-checklist"
import { sendBookingStatusEmail } from "@/lib/booking-notifications"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { z } from "zod"
import type { Booking, BookingStatus, BookingType } from "@/lib/types/database"

const BOOKING_TYPES: BookingType[] = ["free", "paid", "private"]

const mentorshipChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  checked: z.boolean(),
})

export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
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

    const filterMentorId = profile.role === "admin"
      ? searchParams.get("mentorId") || (menteeId ? null : mentorId)
      : mentorId

    const filters = []
    if (filterMentorId) filters.push(eq(bookings.mentorId, filterMentorId))
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
          paidMentorship: paidMentorships,
          profile: profiles,
        })
        .from(bookings)
        .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
        .leftJoin(mentoringSlots, eq(bookings.slotId, mentoringSlots.id))
        .leftJoin(paidMentorships, eq(bookings.paidMentorshipId, paidMentorships.id))
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
        paid_mentorships: row.paidMentorship ? toPublicPaidMentorship(row.paidMentorship) : null,
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

type CreatedBookingRow = {
  id: string
  mentorId: string | null
  menteeId: string | null
  guestName: string | null
  guestEmail: string | null
  guestWhatsapp: string | null
  slotId: string | null
  topicId: string | null
  paidMentorshipId: string | null
  sessionDate: string | null
  startTime: string | null
  bookingType: BookingType
  status: BookingStatus
  notes: string | null
  googleEventId: string | null
  googleMeetUrl: string | null
  topicsDiscussed: string | null
  menteeStrengths: string | null
  menteeGrowthAreas: string | null
  adminNotes: string | null
  mentorshipChecklist: Booking["mentorship_checklist"] | null
  originCategory: Booking["origin_category"] | null
  originDescription: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export async function POST(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
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

    const result = await db.execute<CreatedBookingRow>(sql`
      insert into bookings (
        mentor_id,
        mentee_id,
        topic_id,
        session_date,
        start_time,
        booking_type,
        status,
        notes,
        topics_discussed,
        mentee_strengths,
        mentee_growth_areas,
        admin_notes
      )
      values (
        ${mentorId},
        ${parsed.data.mentee_id},
        ${parsed.data.topic_id || null},
        ${parsed.data.session_date},
        ${startTime},
        ${parsed.data.booking_type},
        ${parsed.data.status},
        ${parsed.data.notes || null},
        ${parsed.data.topics_discussed || null},
        ${parsed.data.mentee_strengths || null},
        ${parsed.data.mentee_growth_areas || null},
        ${parsed.data.admin_notes || null}
      )
      returning
        id,
        mentor_id as "mentorId",
        mentee_id as "menteeId",
        guest_name as "guestName",
        guest_email as "guestEmail",
        guest_whatsapp as "guestWhatsapp",
        slot_id as "slotId",
        topic_id as "topicId",
        paid_mentorship_id as "paidMentorshipId",
        session_date as "sessionDate",
        start_time as "startTime",
        booking_type as "bookingType",
        status,
        notes,
        google_event_id as "googleEventId",
        google_meet_url as "googleMeetUrl",
        topics_discussed as "topicsDiscussed",
        mentee_strengths as "menteeStrengths",
        mentee_growth_areas as "menteeGrowthAreas",
        admin_notes as "adminNotes",
        to_jsonb(bookings) -> 'mentorship_checklist' as "mentorshipChecklist",
        to_jsonb(bookings) ->> 'origin_category' as "originCategory",
        to_jsonb(bookings) ->> 'origin_description' as "originDescription",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `)
    const data = result.rows[0]
    if (!data) {
      return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 })
    }

    if (parsed.data.mentorship_checklist !== undefined) {
      const checklistSnapshot = normalizeMentorshipChecklistSnapshot(parsed.data.mentorship_checklist)

      try {
        await db.execute(sql`
          update bookings
          set mentorship_checklist = ${JSON.stringify(checklistSnapshot)}::jsonb
          where id = ${data.id}
        `)
        data.mentorshipChecklist = checklistSnapshot
      } catch (error) {
        if (!isOptionalBookingMetadataPersistenceError(error)) throw error
        console.warn("[bookings] Skipping optional mentorship_checklist on insert:", error)
      }
    }

    // Agendamento direto: cria o evento na agenda do mentor e avisa o mentorado.
    // Restrito a status de agendamento (não dispara em registros "completed" do histórico).
    let calendarEventCreated = false
    let calendarWarning = false

    if (
      (data.status === "scheduled" || data.status === "confirmed") &&
      data.sessionDate &&
      data.startTime &&
      !data.googleEventId
    ) {
      const [mentee] = await db
        .select({ email: profiles.email, fullName: profiles.fullName, whatsapp: profiles.whatsapp })
        .from(profiles)
        .where(eq(profiles.id, parsed.data.mentee_id))
        .limit(1)

      let topicName = "Mentoria"
      if (data.topicId) {
        const [topic] = await db
          .select({ name: mentoringTopics.name })
          .from(mentoringTopics)
          .where(eq(mentoringTopics.id, data.topicId))
          .limit(1)
        if (topic?.name) topicName = topic.name
      }

      const menteeEmail = mentee?.email || data.guestEmail || undefined
      const menteeName = mentee?.fullName || data.guestName || "Mentorado"

      try {
        const { createCalendarEvent } = await import("@/lib/google-calendar")
        const event = await createCalendarEvent({
          mentorId,
          summary: `Mentoria: ${topicName}`,
          description: `Mentoria com ${menteeName}\nTema: ${topicName}`,
          date: data.sessionDate,
          time: data.startTime.substring(0, 5),
          attendeeEmail: menteeEmail,
        })

        if (event) {
          calendarEventCreated = true
          data.googleEventId = event.eventId
          data.googleMeetUrl = event.meetLink
          await db
            .update(bookings)
            .set({
              googleEventId: event.eventId,
              googleMeetUrl: event.meetLink,
              updatedAt: new Date(),
            })
            .where(eq(bookings.id, data.id))
        } else {
          calendarWarning = true
        }
      } catch (calendarError) {
        console.error("[bookings] Calendar error (non-blocking):", calendarError)
        calendarWarning = true
      }

      await sendBookingStatusEmail({
        status: data.status,
        menteeEmail,
        menteeName,
        topicName,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        bookingType: data.bookingType,
        googleEventId: data.googleEventId,
        googleMeetUrl: data.googleMeetUrl,
        guestWhatsapp: mentee?.whatsapp || data.guestWhatsapp,
      })
    }

    return NextResponse.json(
      {
        data: toBooking(data),
        calendar_event_created: calendarEventCreated,
        calendar_warning: calendarWarning,
      },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
