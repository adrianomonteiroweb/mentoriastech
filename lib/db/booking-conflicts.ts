import { and, eq, inArray, isNull, ne, or } from "drizzle-orm"
import { bookings, db } from "@/lib/db"

const BLOCKING_STATUSES = ["pending", "confirmed", "payment_pending", "paid", "scheduled"] as const

export function normalizeBookingTime(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

export async function hasBookingConflict(params: {
  sessionDate?: string | null
  startTime?: string | null
  mentorId?: string | null
  excludeBookingId?: string
  excludeMenteeId?: string
}) {
  if (!params.sessionDate || !params.startTime) return false

  const filters = [
    eq(bookings.sessionDate, params.sessionDate),
    eq(bookings.startTime, normalizeBookingTime(params.startTime)),
    inArray(bookings.status, BLOCKING_STATUSES),
  ]

  if (params.mentorId) {
    filters.push(eq(bookings.mentorId, params.mentorId))
  }

  if (params.excludeBookingId) {
    filters.push(ne(bookings.id, params.excludeBookingId))
  }

  // O proprio mentee nao conflita consigo mesmo (reagendamento/retry do mesmo Pix).
  // Mantem bookings de convidados (menteeId nulo) na deteccao de conflito.
  if (params.excludeMenteeId) {
    const notSelf = or(
      isNull(bookings.menteeId),
      ne(bookings.menteeId, params.excludeMenteeId),
    )
    if (notSelf) filters.push(notSelf)
  }

  const [existing] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...filters))
    .limit(1)

  return Boolean(existing)
}
