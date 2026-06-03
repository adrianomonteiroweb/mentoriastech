import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, opportunities, opportunityEvents } from "@/lib/db"
import { getEventsByOpportunityId, getOpportunityById } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

const MENTEE_EVENT_TYPES = [
  "note", "follow_up", "interview_scheduled", "message_sent",
  "resume_linked", "application_sent",
] as const

const createEventSchema = z.object({
  event_type: z.enum(MENTEE_EVENT_TYPES),
  title: z.string().optional().or(z.literal("")),
  body: z.string().optional().or(z.literal("")),
  scheduled_at: z.string().datetime().optional().nullable(),
  occurred_at: z.string().datetime().optional(),
})

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function mapEvent(row: {
  event: typeof opportunityEvents.$inferSelect
  authorName: string | null
}) {
  const e = row.event
  return {
    id: e.id,
    opportunity_id: e.opportunityId,
    event_type: e.eventType,
    title: e.title,
    body: e.body,
    from_status: e.fromStatus,
    to_status: e.toStatus,
    scheduled_at: toIso(e.scheduledAt),
    is_completed: e.isCompleted,
    completed_at: toIso(e.completedAt),
    author_id: e.authorId,
    author_name: row.authorName,
    occurred_at: toIso(e.occurredAt) || "",
    created_at: toIso(e.createdAt) || "",
  }
}

// GET /api/minhas-mentorias/opportunities/[id]/events
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const opp = await getOpportunityById(id, profile.id)
    if (!opp) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const rows = await getEventsByOpportunityId(id)
    const data = rows.map(mapEvent)

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// POST /api/minhas-mentorias/opportunities/[id]/events
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const opp = await getOpportunityById(id, profile.id)
    if (!opp) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const data = parsed.data

    const [event] = await db
      .insert(opportunityEvents)
      .values({
        opportunityId: id,
        eventType: data.event_type,
        title: data.title || null,
        body: data.body || null,
        scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
        occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      })
      .returning()

    // Atualizar updatedAt da oportunidade
    await db
      .update(opportunities)
      .set({ updatedAt: new Date() })
      .where(
        and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
      )

    // Se e um follow-up, atualizar nextFollowUpAt na oportunidade
    if (data.event_type === "follow_up" && data.scheduled_at) {
      await db
        .update(opportunities)
        .set({ nextFollowUpAt: new Date(data.scheduled_at) })
        .where(
          and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
        )
    }

    // Se e uma entrevista, atualizar nextInterviewAt
    if (data.event_type === "interview_scheduled" && data.scheduled_at) {
      await db
        .update(opportunities)
        .set({ nextInterviewAt: new Date(data.scheduled_at) })
        .where(
          and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
        )
    }

    return NextResponse.json(
      { data: mapEvent({ event, authorName: null }) },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
