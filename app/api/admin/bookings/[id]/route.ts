import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"
import { bookings, db, mentoringTopics, profiles } from "@/lib/db"
import {
  bookingSelect,
  isOptionalBookingMetadataPersistenceError,
} from "@/lib/db/booking-select"
import { hasBookingConflict, normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { toBooking } from "@/lib/db/mappers"
import { normalizeMentorshipChecklistSnapshot } from "@/lib/mentorship-checklist"
import { sendBookingStatusEmail } from "@/lib/booking-notifications"
import { requireMentorAccess } from "@/lib/utils/auth"

const menteeProfileUpdateSchema = z.object({
  career_status: z
    .enum(["seeking", "interning", "employed", "student", "other"])
    .nullable()
    .optional(),
  seniority: z.enum(["junior", "mid", "senior", "undefined"]).nullable().optional(),
  career_focus: z.string().nullable().optional(),
  origin_category: z
    .enum(["linkedin", "palestra", "indicacao", "instagram", "evento"])
    .nullable()
    .optional(),
  origin_description: z.string().nullable().optional(),
})

const mentorshipChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  checked: z.boolean(),
})

const updateSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "payment_pending",
      "paid",
      "scheduled",
      "completed",
      "cancelled",
    ])
    .optional(),
  notes: z.string().optional(),
  topic_id: z.string().uuid().optional().or(z.literal("")),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional().or(z.literal("")),
  guest_whatsapp: z.string().optional(),
  google_meet_url: z.string().url().optional().or(z.literal("")),
  topics_discussed: z.string().optional(),
  mentee_strengths: z.string().optional(),
  mentee_growth_areas: z.string().optional(),
  admin_notes: z.string().optional(),
  mentorship_checklist: z.array(mentorshipChecklistItemSchema).optional(),
  origin_category: z
    .enum(["linkedin", "palestra", "indicacao", "instagram", "evento"])
    .nullable()
    .optional(),
  origin_description: z.string().nullable().optional(),
  mentee_profile_update: menteeProfileUpdateSchema.optional(),
})

function shouldBlockStatus(status: string | undefined) {
  return status === undefined || ["pending", "confirmed", "paid", "scheduled"].includes(status)
}

async function loadBooking(id: string) {
  const [row] = await db
    .select({ booking: bookingSelect, topic: mentoringTopics, profile: profiles })
    .from(bookings)
    .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .where(eq(bookings.id, id))
    .limit(1)

  return row
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const row = await loadBooking(id)
    if (!row) {
      return NextResponse.json({ error: "Agendamento nao encontrado" }, { status: 404 })
    }

    const nextStatus = parsed.data.status || row.booking.status
    const nextSessionDate = parsed.data.session_date ?? row.booking.sessionDate
    const nextStartTime = parsed.data.start_time
      ? normalizeBookingTime(parsed.data.start_time)
      : row.booking.startTime

    if (
      shouldBlockStatus(nextStatus) &&
      (await hasBookingConflict({
        sessionDate: nextSessionDate,
        startTime: nextStartTime,
        excludeBookingId: id,
      }))
    ) {
      return NextResponse.json(
        { error: "Ja existe um agendamento ativo neste dia e horario." },
        { status: 409 },
      )
    }

    const updateData: Partial<typeof bookings.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes || null
    if (parsed.data.topic_id !== undefined) updateData.topicId = parsed.data.topic_id || null
    if (parsed.data.session_date !== undefined) updateData.sessionDate = parsed.data.session_date
    if (parsed.data.start_time !== undefined) updateData.startTime = normalizeBookingTime(parsed.data.start_time)
    if (parsed.data.guest_name !== undefined) updateData.guestName = parsed.data.guest_name || null
    if (parsed.data.guest_email !== undefined) updateData.guestEmail = parsed.data.guest_email || null
    if (parsed.data.guest_whatsapp !== undefined) updateData.guestWhatsapp = parsed.data.guest_whatsapp || null
    if (parsed.data.google_meet_url !== undefined) updateData.googleMeetUrl = parsed.data.google_meet_url || null
    if (parsed.data.topics_discussed !== undefined) updateData.topicsDiscussed = parsed.data.topics_discussed || null
    if (parsed.data.mentee_strengths !== undefined) updateData.menteeStrengths = parsed.data.mentee_strengths || null
    if (parsed.data.mentee_growth_areas !== undefined) updateData.menteeGrowthAreas = parsed.data.mentee_growth_areas || null
    if (parsed.data.admin_notes !== undefined) updateData.adminNotes = parsed.data.admin_notes || null
    if (parsed.data.mentorship_checklist !== undefined) {
      const checklistSnapshot = normalizeMentorshipChecklistSnapshot(parsed.data.mentorship_checklist)
      ;(updateData as Record<string, unknown>).mentorshipChecklist = sql`${JSON.stringify(checklistSnapshot)}::jsonb`
    }
    if (parsed.data.origin_category !== undefined) updateData.originCategory = parsed.data.origin_category || null
    if (parsed.data.origin_description !== undefined) updateData.originDescription = parsed.data.origin_description || null

    let calendarWarning = false

    if (
      (parsed.data.status === "confirmed" || parsed.data.status === "scheduled") &&
      nextSessionDate &&
      nextStartTime &&
      !row.booking.googleEventId
    ) {
      if (!row.booking.mentorId) {
        calendarWarning = true
      } else {
        try {
          const { createCalendarEvent } = await import("@/lib/google-calendar")
          const menteeEmail = row.profile?.email || row.booking.guestEmail || undefined
          const menteeName = row.profile?.fullName || row.booking.guestName || "Mentorado"
          const topicName = row.topic?.name || "Mentoria"

          const event = await createCalendarEvent({
            mentorId: row.booking.mentorId,
            summary: `Mentoria: ${topicName}`,
            description: `Mentoria com ${menteeName}\nTema: ${topicName}`,
            date: nextSessionDate,
            time: nextStartTime.substring(0, 5),
            attendeeEmail: menteeEmail,
          })

          if (event) {
            updateData.googleEventId = event.eventId
            updateData.googleMeetUrl = event.meetLink
          } else {
            calendarWarning = true
          }
        } catch (calendarError) {
          console.error("[bookings] Calendar error (non-blocking):", calendarError)
          calendarWarning = true
        }
      }
    }

    if (
      parsed.data.status === "cancelled" &&
      row.booking.googleEventId &&
      row.booking.mentorId
    ) {
      try {
        const { deleteCalendarEvent } = await import("@/lib/google-calendar")
        await deleteCalendarEvent({
          mentorId: row.booking.mentorId,
          eventId: row.booking.googleEventId,
        })
        updateData.googleEventId = null
        updateData.googleMeetUrl = null
      } catch (calendarError) {
        console.error("[bookings] Calendar delete error (non-blocking):", calendarError)
      }
    }

    let data
    try {
      ;[data] = await db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning(bookingSelect)
    } catch (error) {
      if (!isOptionalBookingMetadataPersistenceError(error)) throw error

      console.warn("[bookings] Retrying update without optional booking metadata:", error)
      delete updateData.mentorshipChecklist
      delete updateData.originCategory
      delete updateData.originDescription
      ;[data] = await db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning(bookingSelect)
    }

    if (parsed.data.mentee_profile_update && row.booking.menteeId) {
      const profileUpdate: Partial<typeof profiles.$inferInsert> = {
        updatedAt: new Date(),
      }
      const mp = parsed.data.mentee_profile_update
      if (mp.career_status !== undefined) profileUpdate.careerStatus = mp.career_status || null
      if (mp.seniority !== undefined) profileUpdate.seniority = mp.seniority || null
      if (mp.career_focus !== undefined) profileUpdate.careerFocus = mp.career_focus || null
      if (mp.origin_category !== undefined) profileUpdate.originCategory = mp.origin_category || null
      if (mp.origin_description !== undefined) profileUpdate.originDescription = mp.origin_description || null

      if (Object.keys(profileUpdate).length > 1) {
        try {
          await db
            .update(profiles)
            .set(profileUpdate)
            .where(eq(profiles.id, row.booking.menteeId))
        } catch (error) {
          if (!isOptionalBookingMetadataPersistenceError(error)) throw error

          console.warn("[bookings] Retrying profile update without optional origin metadata:", error)
          delete profileUpdate.originCategory
          delete profileUpdate.originDescription

          if (Object.keys(profileUpdate).length > 1) {
            await db
              .update(profiles)
              .set(profileUpdate)
              .where(eq(profiles.id, row.booking.menteeId))
          }
        }
      }
    }

    if (parsed.data.status) {
      await sendBookingStatusEmail({
        status: parsed.data.status,
        menteeEmail: row.profile?.email || row.booking.guestEmail,
        menteeName: row.profile?.fullName || row.booking.guestName || "Mentorado",
        topicName: row.topic?.name || "Mentoria",
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        bookingType: data.bookingType,
        googleEventId: data.googleEventId,
        googleMeetUrl: data.googleMeetUrl,
      })
    }

    return NextResponse.json({ data: toBooking(data), calendar_warning: calendarWarning })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const row = await loadBooking(id)
    if (!row) {
      return NextResponse.json({ error: "Agendamento nao encontrado" }, { status: 404 })
    }

    if (row.booking.googleEventId && row.booking.mentorId) {
      try {
        const { deleteCalendarEvent } = await import("@/lib/google-calendar")
        await deleteCalendarEvent({
          mentorId: row.booking.mentorId,
          eventId: row.booking.googleEventId,
        })
      } catch (calendarError) {
        console.error("[bookings] Calendar delete error (non-blocking):", calendarError)
      }
    }

    await db.delete(bookings).where(eq(bookings.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
