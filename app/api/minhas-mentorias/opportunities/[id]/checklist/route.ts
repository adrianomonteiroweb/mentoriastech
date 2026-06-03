import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, opportunities } from "@/lib/db"
import { getOpportunityById } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

const updateChecklistSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      checked: z.boolean(),
    }),
  ),
})

// PUT /api/minhas-mentorias/opportunities/[id]/checklist
export async function PUT(
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
    const parsed = updateChecklistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const currentChecklist = opp.opportunity.checklist || []
    const updates = new Map(parsed.data.items.map((item) => [item.id, item.checked]))

    const updatedChecklist = currentChecklist.map((item) => ({
      ...item,
      checked: updates.has(item.id) ? updates.get(item.id)! : item.checked,
    }))

    await db
      .update(opportunities)
      .set({
        checklist: updatedChecklist,
        updatedAt: new Date(),
      })
      .where(
        and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
      )

    return NextResponse.json({ data: updatedChecklist })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
