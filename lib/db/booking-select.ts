import { sql } from "drizzle-orm"

import { bookings } from "@/lib/db/schema"
import type { Booking } from "@/lib/types/database"

export const bookingSelect = {
  id: bookings.id,
  menteeId: bookings.menteeId,
  guestName: bookings.guestName,
  guestEmail: bookings.guestEmail,
  guestWhatsapp: bookings.guestWhatsapp,
  slotId: bookings.slotId,
  topicId: bookings.topicId,
  sessionDate: bookings.sessionDate,
  startTime: bookings.startTime,
  bookingType: bookings.bookingType,
  status: bookings.status,
  notes: bookings.notes,
  googleEventId: bookings.googleEventId,
  googleMeetUrl: bookings.googleMeetUrl,
  topicsDiscussed: bookings.topicsDiscussed,
  menteeStrengths: bookings.menteeStrengths,
  menteeGrowthAreas: bookings.menteeGrowthAreas,
  adminNotes: bookings.adminNotes,
  mentorshipChecklist: sql<Booking["mentorship_checklist"]>`
    to_jsonb(bookings) -> 'mentorship_checklist'
  `,
  originCategory: bookings.originCategory,
  originDescription: bookings.originDescription,
  createdAt: bookings.createdAt,
  updatedAt: bookings.updatedAt,
}

export function isMissingMentorshipChecklistColumnError(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()

  return (
    message.includes("mentorship_checklist") &&
    (message.includes("does not exist") || message.includes("schema cache"))
  )
}
