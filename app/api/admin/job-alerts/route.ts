import { NextResponse } from "next/server"
import { asc, desc, eq } from "drizzle-orm"
import { db, jobAlertSubscriptions, profiles } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"
import { mapJobAlertAdmin } from "@/lib/db/job-alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/admin/job-alerts — lista todas as inscrições de vagas por WhatsApp,
// enriquecidas com o mentorado (email/nome). Ativas primeiro, depois por nome.
export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({
        id: jobAlertSubscriptions.id,
        profileId: jobAlertSubscriptions.profileId,
        enabled: jobAlertSubscriptions.enabled,
        name: jobAlertSubscriptions.name,
        whatsapp: jobAlertSubscriptions.whatsapp,
        positions: jobAlertSubscriptions.positions,
        stack: jobAlertSubscriptions.stack,
        levels: jobAlertSubscriptions.levels,
        ignoreWords: jobAlertSubscriptions.ignoreWords,
        isInternational: jobAlertSubscriptions.isInternational,
        dailyLimit: jobAlertSubscriptions.dailyLimit,
        createdAt: jobAlertSubscriptions.createdAt,
        updatedAt: jobAlertSubscriptions.updatedAt,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(jobAlertSubscriptions)
      .innerJoin(profiles, eq(jobAlertSubscriptions.profileId, profiles.id))
      .orderBy(desc(jobAlertSubscriptions.enabled), asc(profiles.fullName))

    return NextResponse.json({ data: rows.map(mapJobAlertAdmin) })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/job-alerts] GET error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar inscrições" },
      { status: 500 },
    )
  }
}
