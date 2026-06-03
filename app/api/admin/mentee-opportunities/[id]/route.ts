import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { companies, db, opportunities } from "@/lib/db"
import { getEventsByOpportunityId } from "@/lib/db/mentee-opportunities"
import { requireRole } from "@/lib/utils/auth"
import { mapOpportunity } from "@/app/api/minhas-mentorias/opportunities/route"

export const dynamic = "force-dynamic"

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

// GET /api/admin/mentee-opportunities/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const [row] = await db
      .select({
        opportunity: opportunities,
        companyName: companies.name,
        companyLinkedinUrl: companies.linkedinUrl,
      })
      .from(opportunities)
      .innerJoin(companies, eq(opportunities.companyId, companies.id))
      .where(eq(opportunities.id, id))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const events = await getEventsByOpportunityId(id)
    const mappedEvents = events.map((e) => ({
      id: e.event.id,
      opportunity_id: e.event.opportunityId,
      event_type: e.event.eventType,
      title: e.event.title,
      body: e.event.body,
      from_status: e.event.fromStatus,
      to_status: e.event.toStatus,
      scheduled_at: toIso(e.event.scheduledAt),
      is_completed: e.event.isCompleted,
      completed_at: toIso(e.event.completedAt),
      author_id: e.event.authorId,
      author_name: e.authorName,
      occurred_at: toIso(e.event.occurredAt) || "",
      created_at: toIso(e.event.createdAt) || "",
    }))

    return NextResponse.json({
      data: {
        ...mapOpportunity(row),
        events: mappedEvents,
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
