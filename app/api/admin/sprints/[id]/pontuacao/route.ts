import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprints } from "@/lib/db"
import { getSprintScoreEvents, toSimScoreEventApi } from "@/lib/db/sim"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const [sprint] = await db
      .select({ id: simSprints.id })
      .from(simSprints)
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const events = await getSprintScoreEvents(id)
    const total = events.reduce((sum, event) => sum + event.delta, 0)
    const byCategory: Record<string, number> = {}
    for (const event of events) {
      byCategory[event.category] = (byCategory[event.category] ?? 0) + event.delta
    }

    return NextResponse.json({
      data: {
        total,
        by_category: byCategory,
        events: events.map(toSimScoreEventApi),
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
