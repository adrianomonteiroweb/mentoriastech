import { NextResponse } from "next/server"
import { and, count, desc, eq, inArray, sql } from "drizzle-orm"
import { db, bookings, profiles, selectionProcesses, selectionProcessCandidates } from "@/lib/db"
import { toProfile, toSelectionProcess, toSelectionProcessCandidate } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { safeProfileResumeHref } from "@/lib/utils/resume-access"
import { z } from "zod"

const updateSchema = z.object({
  company: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["open", "closed"]).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const [process] = await db
      .select()
      .from(selectionProcesses)
      .where(eq(selectionProcesses.id, id))
      .limit(1)

    if (!process) {
      return NextResponse.json({ error: "Processo seletivo nao encontrado" }, { status: 404 })
    }

    const candidateRows = await db
      .select({ candidate: selectionProcessCandidates, profile: profiles })
      .from(selectionProcessCandidates)
      .innerJoin(profiles, eq(selectionProcessCandidates.menteeId, profiles.id))
      .where(eq(selectionProcessCandidates.processId, id))
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
          ...profile,
          resume_url: safeProfileResumeHref(profile.id, profile.resume_url),
        },
        booking_count: bookingCountMap.get(row.profile.id) ?? 0,
      }
    })

    return NextResponse.json({
      data: { ...toSelectionProcess(process), candidates },
    })
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
    await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof selectionProcesses.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.company !== undefined) updateData.company = parsed.data.company
    if (parsed.data.position !== undefined) updateData.position = parsed.data.position
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status

    const [data] = await db
      .update(selectionProcesses)
      .set(updateData)
      .where(eq(selectionProcesses.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Processo seletivo nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toSelectionProcess(data) })
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
    await requireRole("admin")
    const { id } = await params

    const [deleted] = await db
      .delete(selectionProcesses)
      .where(eq(selectionProcesses.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Processo seletivo nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
