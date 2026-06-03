import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { companies, db, opportunities } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"
import { mapOpportunity } from "@/app/api/minhas-mentorias/opportunities/route"

export const dynamic = "force-dynamic"

// GET /api/admin/mentee-opportunities?mentee_id=uuid
export async function GET(request: Request) {
  try {
    await requireRole("admin")

    const { searchParams } = new URL(request.url)
    const menteeId = searchParams.get("mentee_id")
    if (!menteeId) {
      return NextResponse.json({ error: "mentee_id e obrigatorio" }, { status: 400 })
    }

    const rows = await db
      .select({
        opportunity: opportunities,
        companyName: companies.name,
        companyLinkedinUrl: companies.linkedinUrl,
      })
      .from(opportunities)
      .innerJoin(companies, eq(opportunities.companyId, companies.id))
      .where(eq(opportunities.profileId, menteeId))
      .orderBy(desc(opportunities.updatedAt))

    const data = rows.map(mapOpportunity)
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
