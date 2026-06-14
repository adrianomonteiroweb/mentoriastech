import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, selectionProcessCandidates } from "@/lib/db"
import { toSelectionProcessCandidate } from "@/lib/db/mappers"
import {
  calculateSelectionProcessScore,
  normalizeSelectionProcessChecklist,
} from "@/lib/selection-process-checklist"
import { requireRole } from "@/lib/utils/auth"
import { z } from "zod"

const updateSchema = z.object({
  checklist: z
    .array(z.object({ id: z.string().min(1), checked: z.boolean() }))
    .optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; candidateId: string }> },
) {
  try {
    await requireRole("admin")
    const { id, candidateId } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof selectionProcessCandidates.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.checklist !== undefined) {
      const checklist = normalizeSelectionProcessChecklist(parsed.data.checklist)
      updateData.checklist = checklist
      updateData.score = calculateSelectionProcessScore(checklist)
    }
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

    const [data] = await db
      .update(selectionProcessCandidates)
      .set(updateData)
      .where(
        and(
          eq(selectionProcessCandidates.id, candidateId),
          eq(selectionProcessCandidates.processId, id),
        ),
      )
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Candidato nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toSelectionProcessCandidate(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; candidateId: string }> },
) {
  try {
    await requireRole("admin")
    const { id, candidateId } = await params

    const [deleted] = await db
      .delete(selectionProcessCandidates)
      .where(
        and(
          eq(selectionProcessCandidates.id, candidateId),
          eq(selectionProcessCandidates.processId, id),
        ),
      )
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Candidato nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
