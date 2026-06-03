import { NextResponse } from "next/server"
import { getWeeklyStats } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

// GET /api/minhas-mentorias/opportunities/stats
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const stats = await getWeeklyStats(profile.id)
    return NextResponse.json({ data: stats })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
