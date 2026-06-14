import { NextResponse } from "next/server"
import { desc, inArray, sql } from "drizzle-orm"
import { db, selectionProcesses, selectionProcessCandidates } from "@/lib/db"
import { toSelectionProcess } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { z } from "zod"

const createSchema = z.object({
  company: z.string().min(1, "Empresa e obrigatoria"),
  position: z.string().min(1, "Posicao e obrigatoria"),
  description: z.string().optional(),
})

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select()
      .from(selectionProcesses)
      .orderBy(desc(selectionProcesses.createdAt))

    const processIds = rows.map((row) => row.id)
    const countMap = new Map<string, number>()

    if (processIds.length > 0) {
      const counts = await db
        .select({
          processId: selectionProcessCandidates.processId,
          count: sql<number>`count(*)::int`,
        })
        .from(selectionProcessCandidates)
        .where(inArray(selectionProcessCandidates.processId, processIds))
        .groupBy(selectionProcessCandidates.processId)

      for (const row of counts) {
        countMap.set(row.processId, row.count)
      }
    }

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toSelectionProcess(row),
        candidate_count: countMap.get(row.id) || 0,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [data] = await db
      .insert(selectionProcesses)
      .values({
        company: parsed.data.company,
        position: parsed.data.position,
        description: parsed.data.description || null,
        createdBy: profile.id,
      })
      .returning()

    return NextResponse.json(
      { data: { ...toSelectionProcess(data), candidate_count: 0 } },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
