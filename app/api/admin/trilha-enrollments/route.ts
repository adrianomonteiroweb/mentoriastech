import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { requireMentorAccess } from "@/lib/utils/auth"
import { db, learningTracks, profiles, trackEnrollments } from "@/lib/db"
import { toTrackEnrollment } from "@/lib/db/mappers"
import type { TrackEnrollmentStatus } from "@/lib/types/database"

const STATUSES: TrackEnrollmentStatus[] = [
  "pending",
  "active",
  "completed",
  "cancelled",
]

export async function GET(request: Request) {
  try {
    await requireMentorAccess()

    const url = new URL(request.url)
    const statusParam = url.searchParams.get("status")
    const status = STATUSES.includes(statusParam as TrackEnrollmentStatus)
      ? (statusParam as TrackEnrollmentStatus)
      : null

    const rows = await db
      .select({
        enrollment: trackEnrollments,
        trackTitle: learningTracks.title,
        menteeName: profiles.fullName,
        menteeEmail: profiles.email,
      })
      .from(trackEnrollments)
      .leftJoin(learningTracks, eq(trackEnrollments.trackId, learningTracks.id))
      .leftJoin(profiles, eq(trackEnrollments.menteeId, profiles.id))
      .where(status ? eq(trackEnrollments.status, status) : undefined)
      .orderBy(desc(trackEnrollments.createdAt))

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toTrackEnrollment(row.enrollment),
        track_title: row.trackTitle ?? null,
        mentee_name: row.menteeName ?? row.enrollment.guestName ?? null,
        mentee_email: row.menteeEmail ?? row.enrollment.guestEmail ?? null,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
