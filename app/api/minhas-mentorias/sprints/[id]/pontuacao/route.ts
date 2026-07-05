import { NextResponse } from "next/server"
import {
  getSprintOwnedByProfile,
  getSprintScoreEvents,
  toSimScoreEventApi,
} from "@/lib/db/sim"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Ledger de pontuação: eventos (não-supersedados), total e subtotais por categoria. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const sprint = await getSprintOwnedByProfile(id, profile.id)
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
