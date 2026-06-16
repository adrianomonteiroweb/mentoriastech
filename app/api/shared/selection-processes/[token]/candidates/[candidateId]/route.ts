import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, selectionProcessCandidates, selectionProcessShareLinks } from "@/lib/db"
import { toSelectionProcessCandidate } from "@/lib/db/mappers"
import {
  calculateSelectionProcessScore,
  normalizeSelectionProcessChecklist,
} from "@/lib/selection-process-checklist"
import { z } from "zod"

const updateSchema = z.object({
  checklist: z
    .array(z.object({ id: z.string().min(1), checked: z.boolean() }))
    .optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string; candidateId: string }> },
) {
  try {
    const { token, candidateId } = await params

    const [link] = await db
      .select()
      .from(selectionProcessShareLinks)
      .where(eq(selectionProcessShareLinks.token, token))
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: "Link invalido ou revogado" }, { status: 404 })
    }

    if (link.permission !== "edit") {
      return NextResponse.json({ error: "Sem permissao de edicao" }, { status: 403 })
    }

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
          eq(selectionProcessCandidates.processId, link.processId),
        ),
      )
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Candidato nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toSelectionProcessCandidate(data) })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
