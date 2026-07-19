import { NextResponse } from "next/server"
import { and, asc, eq, gt } from "drizzle-orm"
import { z } from "zod"
import { requireMentorAccess } from "@/lib/utils/auth"
import {
  bookings,
  db,
  trackEnrollmentPhases,
  trackEnrollments,
} from "@/lib/db"
import type { TrackEnrollment, TrackEnrollmentPhase } from "@/lib/db/schema"
import { hasBookingConflict, normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { createCalendarEvent } from "@/lib/google-calendar"
import { getDefaultMentorId } from "@/lib/utils/auth"
import { sendBookingStatusEmail } from "@/lib/booking-notifications"
import { getEnrollmentWithDetails } from "@/lib/trilhas/queries"

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("schedule_phase"),
    phase_id: z.string().uuid(),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    topic_id: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("complete_phase"),
    phase_id: z.string().uuid(),
  }),
])

class ActionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Cria o booking de uma fase e marca a fase como `scheduled`. */
async function createPhaseBooking(params: {
  enrollment: TrackEnrollment
  phase: TrackEnrollmentPhase
  sessionDate: string
  startTime: string
  topicId?: string | null
}) {
  const { enrollment, phase } = params
  const mentorId = await getDefaultMentorId()
  const normalizedTime = normalizeBookingTime(params.startTime)

  if (
    await hasBookingConflict({
      sessionDate: params.sessionDate,
      startTime: params.startTime,
      mentorId,
    })
  ) {
    throw new ActionError(
      "Este horario ja esta ocupado. Escolha outro horario.",
      409,
    )
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      mentorId,
      menteeId: enrollment.menteeId,
      guestName: enrollment.guestName,
      guestEmail: enrollment.guestEmail,
      guestWhatsapp: enrollment.guestWhatsapp,
      bookingType: "free",
      status: "scheduled",
      sessionDate: params.sessionDate,
      startTime: normalizedTime,
      topicId: params.topicId || enrollment.requestedTopicId || null,
      trackEnrollmentPhaseId: phase.id,
      notes: `Trilha — Fase: ${phase.title}`,
    })
    .returning()

  // Google Calendar (não bloqueante).
  let googleMeetUrl: string | null = null
  try {
    const event = await createCalendarEvent({
      mentorId,
      summary: `Trilha — ${phase.title}`,
      description: `Fase da trilha de recolocação: ${phase.title}`,
      date: params.sessionDate,
      time: params.startTime.slice(0, 5),
      attendeeEmail: enrollment.guestEmail || undefined,
    })
    if (event) {
      googleMeetUrl = event.meetLink
      await db
        .update(bookings)
        .set({
          googleEventId: event.eventId,
          googleMeetUrl: event.meetLink,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
    }
  } catch (calendarError) {
    console.error("[trilha] Calendar error (non-blocking):", calendarError)
  }

  await db
    .update(trackEnrollmentPhases)
    .set({ status: "scheduled", bookingId: booking.id, updatedAt: new Date() })
    .where(eq(trackEnrollmentPhases.id, phase.id))

  void sendBookingStatusEmail({
    status: "scheduled",
    menteeEmail: enrollment.guestEmail,
    menteeName: enrollment.guestName || "Mentorado",
    topicName: phase.title,
    sessionDate: params.sessionDate,
    startTime: normalizedTime,
    bookingType: "free",
    googleMeetUrl,
    guestWhatsapp: enrollment.guestWhatsapp,
  })

  return booking
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const enrollment = await getEnrollmentWithDetails(id)
    if (!enrollment) {
      return NextResponse.json({ error: "Inscricao nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: enrollment })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Acao invalida", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [enrollment] = await db
      .select()
      .from(trackEnrollments)
      .where(eq(trackEnrollments.id, id))
      .limit(1)

    if (!enrollment) {
      return NextResponse.json({ error: "Inscricao nao encontrada" }, { status: 404 })
    }

    const action = parsed.data

    if (action.action === "confirm") {
      if (enrollment.status !== "pending") {
        throw new ActionError("Inscricao ja foi confirmada ou encerrada.", 409)
      }
      if (!enrollment.requestedSessionDate || !enrollment.requestedStartTime) {
        throw new ActionError(
          "Inscricao sem slot escolhido para a Fase 1.",
          400,
        )
      }

      const [firstPhase] = await db
        .select()
        .from(trackEnrollmentPhases)
        .where(
          and(
            eq(trackEnrollmentPhases.enrollmentId, enrollment.id),
            eq(trackEnrollmentPhases.status, "pending"),
          ),
        )
        .orderBy(asc(trackEnrollmentPhases.sortOrder))
        .limit(1)

      if (!firstPhase) {
        throw new ActionError("Nenhuma fase pendente para agendar.", 400)
      }

      await createPhaseBooking({
        enrollment,
        phase: firstPhase,
        sessionDate: enrollment.requestedSessionDate,
        startTime: enrollment.requestedStartTime,
      })

      await db
        .update(trackEnrollments)
        .set({ status: "active", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(trackEnrollments.id, enrollment.id))
    } else if (action.action === "schedule_phase") {
      const [phase] = await db
        .select()
        .from(trackEnrollmentPhases)
        .where(
          and(
            eq(trackEnrollmentPhases.id, action.phase_id),
            eq(trackEnrollmentPhases.enrollmentId, enrollment.id),
          ),
        )
        .limit(1)

      if (!phase) {
        throw new ActionError("Fase nao encontrada nesta inscricao.", 404)
      }
      if (phase.status === "completed" || phase.status === "skipped") {
        throw new ActionError("Esta fase nao pode ser agendada.", 409)
      }

      await createPhaseBooking({
        enrollment,
        phase,
        sessionDate: action.session_date,
        startTime: action.start_time,
        topicId: action.topic_id,
      })

      if (enrollment.status === "pending") {
        await db
          .update(trackEnrollments)
          .set({ status: "active", confirmedAt: new Date(), updatedAt: new Date() })
          .where(eq(trackEnrollments.id, enrollment.id))
      }
    } else if (action.action === "complete_phase") {
      const [phase] = await db
        .select()
        .from(trackEnrollmentPhases)
        .where(
          and(
            eq(trackEnrollmentPhases.id, action.phase_id),
            eq(trackEnrollmentPhases.enrollmentId, enrollment.id),
          ),
        )
        .limit(1)

      if (!phase) {
        throw new ActionError("Fase nao encontrada nesta inscricao.", 404)
      }

      await db
        .update(trackEnrollmentPhases)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(trackEnrollmentPhases.id, phase.id))

      // Destrava a próxima fase bloqueada (ignora skipped).
      const [nextPhase] = await db
        .select()
        .from(trackEnrollmentPhases)
        .where(
          and(
            eq(trackEnrollmentPhases.enrollmentId, enrollment.id),
            eq(trackEnrollmentPhases.status, "locked"),
            gt(trackEnrollmentPhases.sortOrder, phase.sortOrder),
          ),
        )
        .orderBy(asc(trackEnrollmentPhases.sortOrder))
        .limit(1)

      if (nextPhase) {
        await db
          .update(trackEnrollmentPhases)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(trackEnrollmentPhases.id, nextPhase.id))
      } else {
        // Sem próximas fases acionáveis → inscrição concluída.
        const remaining = await db
          .select({ id: trackEnrollmentPhases.id })
          .from(trackEnrollmentPhases)
          .where(
            and(
              eq(trackEnrollmentPhases.enrollmentId, enrollment.id),
              eq(trackEnrollmentPhases.status, "pending"),
            ),
          )
          .limit(1)

        if (remaining.length === 0) {
          await db
            .update(trackEnrollments)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(trackEnrollments.id, enrollment.id))
        }
      }
    } else if (action.action === "cancel") {
      await db
        .update(trackEnrollments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(trackEnrollments.id, enrollment.id))
    }

    const detail = await getEnrollmentWithDetails(enrollment.id)
    return NextResponse.json({ data: detail })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
