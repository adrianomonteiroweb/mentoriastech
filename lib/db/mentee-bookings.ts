import { and, desc, eq, or, sql } from "drizzle-orm"
import { bookings, db, mentoringTopics, profiles } from "@/lib/db"

export interface MenteeBookingItem {
  id: string
  sessionDate: string | null
  startTime: string | null
  topicName: string | null
  status: string
  bookingType: string
  topicsDiscussed: string | null
  menteeStrengths: string | null
  menteeGrowthAreas: string | null
  adminNotes: string | null
  notes: string | null
  guestName: string | null
  createdAt: Date
}

export async function getMenteeBookingsByEmail(
  email: string,
): Promise<MenteeBookingItem[]> {
  const normalized = email.trim().toLowerCase()

  const rows = await db
    .select({
      id: bookings.id,
      sessionDate: bookings.sessionDate,
      startTime: bookings.startTime,
      topicName: mentoringTopics.name,
      status: bookings.status,
      bookingType: bookings.bookingType,
      topicsDiscussed: bookings.topicsDiscussed,
      menteeStrengths: bookings.menteeStrengths,
      menteeGrowthAreas: bookings.menteeGrowthAreas,
      adminNotes: bookings.adminNotes,
      notes: bookings.notes,
      guestName: bookings.guestName,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .where(
      and(
        eq(bookings.status, "completed"),
        or(
          eq(bookings.guestEmail, normalized),
          eq(profiles.email, normalized),
        ),
        or(
          sql`${bookings.topicsDiscussed} IS NOT NULL AND ${bookings.topicsDiscussed} <> ''`,
          sql`${bookings.menteeStrengths} IS NOT NULL AND ${bookings.menteeStrengths} <> ''`,
          sql`${bookings.menteeGrowthAreas} IS NOT NULL AND ${bookings.menteeGrowthAreas} <> ''`,
          sql`${bookings.adminNotes} IS NOT NULL AND ${bookings.adminNotes} <> ''`,
          sql`EXISTS (SELECT 1 FROM booking_attachments ba WHERE ba.booking_id = ${bookings.id})`,
        ),
      ),
    )
    .orderBy(desc(bookings.sessionDate), desc(bookings.createdAt))

  return rows
}

export async function getMenteeBookingByIdForEmail(
  bookingId: string,
  email: string,
): Promise<MenteeBookingItem | null> {
  const normalized = email.trim().toLowerCase()

  const [row] = await db
    .select({
      id: bookings.id,
      sessionDate: bookings.sessionDate,
      startTime: bookings.startTime,
      topicName: mentoringTopics.name,
      status: bookings.status,
      bookingType: bookings.bookingType,
      topicsDiscussed: bookings.topicsDiscussed,
      menteeStrengths: bookings.menteeStrengths,
      menteeGrowthAreas: bookings.menteeGrowthAreas,
      adminNotes: bookings.adminNotes,
      notes: bookings.notes,
      guestName: bookings.guestName,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .where(
      and(
        eq(bookings.id, bookingId),
        or(
          eq(bookings.guestEmail, normalized),
          eq(profiles.email, normalized),
        ),
      ),
    )
    .limit(1)

  return row || null
}
