import { NextResponse } from "next/server"
import { and, count, desc, eq, inArray, sql } from "drizzle-orm"
import {
  db,
  bookings,
  profiles,
  selectionProcesses,
  selectionProcessCandidates,
  selectionProcessShareLinks,
} from "@/lib/db"
import { toProfile, toSelectionProcess, toSelectionProcessCandidate } from "@/lib/db/mappers"
import { safeProfileResumeHref } from "@/lib/utils/resume-access"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    const [link] = await db
      .select()
      .from(selectionProcessShareLinks)
      .where(eq(selectionProcessShareLinks.token, token))
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: "Link invalido ou revogado" }, { status: 404 })
    }

    const [process] = await db
      .select()
      .from(selectionProcesses)
      .where(eq(selectionProcesses.id, link.processId))
      .limit(1)

    if (!process) {
      return NextResponse.json({ error: "Processo seletivo nao encontrado" }, { status: 404 })
    }

    const candidateRows = await db
      .select({ candidate: selectionProcessCandidates, profile: profiles })
      .from(selectionProcessCandidates)
      .innerJoin(profiles, eq(selectionProcessCandidates.menteeId, profiles.id))
      .where(eq(selectionProcessCandidates.processId, link.processId))
      .orderBy(sql`${selectionProcessCandidates.score} DESC NULLS LAST`, desc(selectionProcessCandidates.createdAt))

    const menteeIds = candidateRows.map((row) => row.profile.id)
    const bookingCountMap = new Map<string, number>()

    if (menteeIds.length > 0) {
      const counts = await db
        .select({ menteeId: bookings.menteeId, cnt: count(bookings.id) })
        .from(bookings)
        .where(and(inArray(bookings.menteeId, menteeIds), eq(bookings.status, "completed")))
        .groupBy(bookings.menteeId)

      for (const row of counts) {
        if (row.menteeId) bookingCountMap.set(row.menteeId, row.cnt)
      }
    }

    const candidates = candidateRows.map((row) => {
      const profile = toProfile(row.profile)
      return {
        ...toSelectionProcessCandidate(row.candidate),
        profiles: {
          full_name: profile.full_name,
          email: profile.email,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
          resume_url: safeProfileResumeHref(profile.id, profile.resume_url),
        },
        booking_count: bookingCountMap.get(row.profile.id) ?? 0,
      }
    })

    return NextResponse.json({
      data: {
        ...toSelectionProcess(process),
        candidates,
      },
      permission: link.permission,
    })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
