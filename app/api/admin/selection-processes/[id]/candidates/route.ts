import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, selectionProcesses, selectionProcessCandidates } from "@/lib/db"
import { toSelectionProcessCandidate } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { z } from "zod"

const createSchema = z.object({
  mentee_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um mentorado"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [process] = await db
      .select({ id: selectionProcesses.id })
      .from(selectionProcesses)
      .where(eq(selectionProcesses.id, id))
      .limit(1)

    if (!process) {
      return NextResponse.json({ error: "Processo seletivo nao encontrado" }, { status: 404 })
    }

    const data = await db
      .insert(selectionProcessCandidates)
      .values(
        parsed.data.mentee_ids.map((menteeId) => ({
          processId: id,
          menteeId,
        })),
      )
      .onConflictDoNothing({
        target: [selectionProcessCandidates.processId, selectionProcessCandidates.menteeId],
      })
      .returning()

    return NextResponse.json({ data: data.map(toSelectionProcessCandidate) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
