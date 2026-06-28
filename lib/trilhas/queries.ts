import { and, asc, eq, inArray } from "drizzle-orm"
import {
  bookings,
  contentItems,
  db,
  learningTrackPhases,
  learningTracks,
  paidMentorships,
  trackEnrollmentPhases,
  trackEnrollments,
  trackPhaseContent,
} from "@/lib/db"
import {
  toContentItem,
  toLearningTrack,
  toLearningTrackPhase,
  toPublicPaidMentorship,
  toTrackEnrollment,
  toTrackEnrollmentPhase,
} from "@/lib/db/mappers"
import type {
  ContentItem,
  LearningTrackPhaseWithContent,
  LearningTrackWithPhases,
  PublicPaidMentorship,
  TrackEnrollmentPhaseWithDetails,
  TrackEnrollmentWithDetails,
} from "@/lib/types/database"

async function loadPhasesWithContent(
  trackId: string,
): Promise<LearningTrackPhaseWithContent[]> {
  const phases = await db
    .select()
    .from(learningTrackPhases)
    .where(eq(learningTrackPhases.trackId, trackId))
    .orderBy(asc(learningTrackPhases.sortOrder))

  if (phases.length === 0) return []

  const phaseIds = phases.map((p) => p.id)
  const links = await db
    .select({ phaseId: trackPhaseContent.phaseId, item: contentItems })
    .from(trackPhaseContent)
    .innerJoin(contentItems, eq(trackPhaseContent.contentId, contentItems.id))
    .where(inArray(trackPhaseContent.phaseId, phaseIds))
    .orderBy(asc(trackPhaseContent.sortOrder))

  const byPhase = new Map<string, ContentItem[]>()
  for (const link of links) {
    const list = byPhase.get(link.phaseId) ?? []
    list.push(toContentItem(link.item))
    byPhase.set(link.phaseId, list)
  }

  return phases.map((phase) => ({
    ...toLearningTrackPhase(phase),
    content: byPhase.get(phase.id) ?? [],
  }))
}

async function loadEnglishMentorship(
  id: string | null,
): Promise<PublicPaidMentorship | null> {
  if (!id) return null
  const [row] = await db
    .select()
    .from(paidMentorships)
    .where(and(eq(paidMentorships.id, id), eq(paidMentorships.isActive, true)))
    .limit(1)
  return row ? toPublicPaidMentorship(row) : null
}

export async function getTrackWithPhases(
  trackId: string,
): Promise<LearningTrackWithPhases | null> {
  const [track] = await db
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.id, trackId))
    .limit(1)

  if (!track) return null

  return {
    ...toLearningTrack(track),
    phases: await loadPhasesWithContent(track.id),
    english_mentorship: await loadEnglishMentorship(track.englishPaidMentorshipId),
  }
}

export async function getActiveTracksWithPhases(): Promise<LearningTrackWithPhases[]> {
  const tracks = await db
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.isActive, true))
    .orderBy(asc(learningTracks.sortOrder))

  const result: LearningTrackWithPhases[] = []
  for (const track of tracks) {
    result.push({
      ...toLearningTrack(track),
      phases: await loadPhasesWithContent(track.id),
      english_mentorship: await loadEnglishMentorship(track.englishPaidMentorshipId),
    })
  }
  return result
}

export async function getEnrollmentWithDetails(
  enrollmentId: string,
): Promise<TrackEnrollmentWithDetails | null> {
  const [enrollment] = await db
    .select()
    .from(trackEnrollments)
    .where(eq(trackEnrollments.id, enrollmentId))
    .limit(1)

  if (!enrollment) return null

  return buildEnrollmentDetails(enrollment)
}

export async function getEnrollmentsForMentee(
  menteeId: string,
): Promise<TrackEnrollmentWithDetails[]> {
  const rows = await db
    .select()
    .from(trackEnrollments)
    .where(eq(trackEnrollments.menteeId, menteeId))
    .orderBy(asc(trackEnrollments.createdAt))

  const result: TrackEnrollmentWithDetails[] = []
  for (const row of rows) {
    result.push(await buildEnrollmentDetails(row))
  }
  return result
}

async function buildEnrollmentDetails(
  enrollment: typeof trackEnrollments.$inferSelect,
): Promise<TrackEnrollmentWithDetails> {
  const track = enrollment.trackId
    ? (
        await db
          .select()
          .from(learningTracks)
          .where(eq(learningTracks.id, enrollment.trackId))
          .limit(1)
      )[0]
    : undefined

  // Conteúdo por fase (mapeado por phaseKey a partir do template da trilha).
  const contentByKey = new Map<string, ContentItem[]>()
  if (enrollment.trackId) {
    const templatePhases = await loadPhasesWithContent(enrollment.trackId)
    for (const phase of templatePhases) {
      contentByKey.set(phase.phase_key, phase.content)
    }
  }

  const phaseRows = await db
    .select()
    .from(trackEnrollmentPhases)
    .where(eq(trackEnrollmentPhases.enrollmentId, enrollment.id))
    .orderBy(asc(trackEnrollmentPhases.sortOrder))

  const bookingIds = phaseRows
    .map((p) => p.bookingId)
    .filter((id): id is string => Boolean(id))

  const bookingById = new Map<
    string,
    TrackEnrollmentPhaseWithDetails["booking"]
  >()
  if (bookingIds.length > 0) {
    const bookingRows = await db
      .select({
        id: bookings.id,
        sessionDate: bookings.sessionDate,
        startTime: bookings.startTime,
        status: bookings.status,
        googleMeetUrl: bookings.googleMeetUrl,
      })
      .from(bookings)
      .where(inArray(bookings.id, bookingIds))

    for (const b of bookingRows) {
      bookingById.set(b.id, {
        id: b.id,
        session_date: b.sessionDate,
        start_time: b.startTime,
        status: b.status,
        google_meet_url: b.googleMeetUrl,
      })
    }
  }

  const phases: TrackEnrollmentPhaseWithDetails[] = phaseRows.map((phase) => ({
    ...toTrackEnrollmentPhase(phase),
    content: contentByKey.get(phase.phaseKey) ?? [],
    booking: phase.bookingId ? bookingById.get(phase.bookingId) ?? null : null,
  }))

  const englishMentorship =
    enrollment.includeEnglish && track?.englishPaidMentorshipId
      ? await loadEnglishMentorship(track.englishPaidMentorshipId)
      : null

  return {
    ...toTrackEnrollment(enrollment),
    track: track
      ? {
          id: track.id,
          title: track.title,
          slug: track.slug,
          supports_english: track.supportsEnglish,
          cover_image_url: track.coverImageUrl,
        }
      : null,
    phases,
    english_mentorship: englishMentorship,
  }
}
