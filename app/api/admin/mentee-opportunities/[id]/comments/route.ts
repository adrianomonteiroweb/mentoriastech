import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, opportunities, opportunityEvents } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"

export const dynamic = "force-dynamic"

const commentSchema = z.object({
  body: z.string().min(1, "Comentario nao pode ser vazio"),
})

// POST /api/admin/mentee-opportunities/[id]/comments
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole("admin", "mentor")
    const { id } = await params

    // Verificar que a oportunidade existe
    const [opp] = await db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1)

    if (!opp) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = commentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    // Criar evento de mentor_comment na timeline
    const [event] = await db
      .insert(opportunityEvents)
      .values({
        opportunityId: id,
        eventType: "mentor_comment",
        title: "Comentario do mentor",
        body: parsed.data.body,
        authorId: actor.id,
      })
      .returning()

    // Atualizar updatedAt da oportunidade
    await db
      .update(opportunities)
      .set({ updatedAt: new Date() })
      .where(eq(opportunities.id, id))

    function toIso(value: Date | string | null | undefined): string | null {
      if (!value) return null
      return value instanceof Date ? value.toISOString() : value
    }

    return NextResponse.json(
      {
        data: {
          id: event.id,
          opportunity_id: event.opportunityId,
          event_type: event.eventType,
          title: event.title,
          body: event.body,
          author_id: event.authorId,
          author_name: actor.full_name || "Mentor",
          occurred_at: toIso(event.occurredAt) || "",
          created_at: toIso(event.createdAt) || "",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
