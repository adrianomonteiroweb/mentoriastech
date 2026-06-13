import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"

import { bookingHistorySyncQueue, bookings, db } from "@/lib/db"
import { bookingSelect } from "@/lib/db/booking-select"
import { normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { toBooking } from "@/lib/db/mappers"
import { requireMentorAccess } from "@/lib/utils/auth"

const historyPayloadSchema = z.object({
  topic_id: z.string().uuid().or(z.literal("")),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).or(z.literal("")),
  topics_discussed: z.string().max(12000),
  mentee_strengths: z.string().max(12000),
  mentee_growth_areas: z.string().max(12000),
  admin_notes: z.string().max(12000),
})

const syncSchema = z.object({
  mutation_id: z.string().uuid(),
  booking_id: z.string().uuid(),
  payload: historyPayloadSchema,
  client_created_at: z.string().datetime().optional(),
})

export async function POST(request: Request) {
  let mutationId: string | null = null

  try {
    const admin = await requireMentorAccess()
    const body = await request.json()
    const parsed = syncSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    mutationId = parsed.data.mutation_id
    const clientCreatedAt = parsed.data.client_created_at
      ? new Date(parsed.data.client_created_at)
      : null

    await db.execute(sql`
      insert into booking_history_sync_queue (
        id,
        booking_id,
        requested_by,
        payload,
        status,
        error,
        client_created_at,
        updated_at
      )
      values (
        ${parsed.data.mutation_id}::uuid,
        ${parsed.data.booking_id}::uuid,
        ${admin.id}::uuid,
        ${JSON.stringify(parsed.data.payload)}::jsonb,
        'pending',
        null,
        ${clientCreatedAt},
        now()
      )
      on conflict (id) do update
      set
        booking_id = excluded.booking_id,
        requested_by = excluded.requested_by,
        payload = excluded.payload,
        status = 'pending',
        error = null,
        client_created_at = excluded.client_created_at,
        updated_at = now()
    `)

    const payload = parsed.data.payload
    const updateData: Partial<typeof bookings.$inferInsert> = {
      topicId: payload.topic_id || null,
      sessionDate: payload.session_date || null,
      startTime: payload.start_time ? normalizeBookingTime(payload.start_time) : null,
      topicsDiscussed: payload.topics_discussed || null,
      menteeStrengths: payload.mentee_strengths || null,
      menteeGrowthAreas: payload.mentee_growth_areas || null,
      adminNotes: payload.admin_notes || null,
      updatedAt: new Date(),
    }

    const [data] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, parsed.data.booking_id))
      .returning(bookingSelect)

    if (!data) {
      throw new Error("Agendamento nao encontrado")
    }

    await db
      .update(bookingHistorySyncQueue)
      .set({
        status: "processed",
        processedAt: new Date(),
        updatedAt: new Date(),
        error: null,
      })
      .where(eq(bookingHistorySyncQueue.id, parsed.data.mutation_id))

    return NextResponse.json({ data: toBooking(data) })
  } catch (error) {
    if (mutationId) {
      try {
        await db
          .update(bookingHistorySyncQueue)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : "Erro ao sincronizar",
            updatedAt: new Date(),
          })
          .where(eq(bookingHistorySyncQueue.id, mutationId))
      } catch {
      }
    }

    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
