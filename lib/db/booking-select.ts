import { sql } from "drizzle-orm"

import { bookings } from "@/lib/db/schema"
import type { Booking } from "@/lib/types/database"

export const bookingSelect = {
  id: bookings.id,
  mentorId: bookings.mentorId,
  menteeId: bookings.menteeId,
  guestName: bookings.guestName,
  guestEmail: bookings.guestEmail,
  guestWhatsapp: bookings.guestWhatsapp,
  slotId: bookings.slotId,
  topicId: bookings.topicId,
  paidMentorshipId: sql<Booking["paid_mentorship_id"]>`
    to_jsonb(bookings) ->> 'paid_mentorship_id'
  `,
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
  // Colunas de IA lidas via to_jsonb p/ não quebrar instalações sem a migração.
  aiTranscript: sql<Booking["ai_transcript"]>`
    to_jsonb(bookings) ->> 'ai_transcript'
  `,
  aiSummary: sql<Booking["ai_summary"]>`
    to_jsonb(bookings) ->> 'ai_summary'
  `,
  aiTranscriptStatus: sql<Booking["ai_transcript_status"]>`
    to_jsonb(bookings) ->> 'ai_transcript_status'
  `,
  mentorshipChecklist: sql<Booking["mentorship_checklist"]>`
    to_jsonb(bookings) -> 'mentorship_checklist'
  `,
  originCategory: sql<Booking["origin_category"]>`
    to_jsonb(bookings) ->> 'origin_category'
  `,
  originDescription: sql<Booking["origin_description"]>`
    to_jsonb(bookings) ->> 'origin_description'
  `,
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

export function isMentorshipChecklistPersistenceError(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()

  return message.includes("mentorship_checklist")
}

export function isOptionalBookingMetadataPersistenceError(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()

  return (
    message.includes("mentorship_checklist") ||
    message.includes("origin_category") ||
    message.includes("origin_description") ||
    message.includes("paid_mentorship_id") ||
    message.includes("ai_transcript") ||
    message.includes("ai_summary") ||
    message.includes("ai_transcript_status")
  )
}
