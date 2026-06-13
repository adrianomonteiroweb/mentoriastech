import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, mentoringTopics } from "@/lib/db"
import { toMentoringTopic } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["free", "paid"]).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof mentoringTopics.$inferInsert> = {}

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active
    if (parsed.data.sort_order !== undefined) updateData.sortOrder = parsed.data.sort_order

    const ownershipFilter = profile.role === "admin"
      ? eq(mentoringTopics.id, id)
      : and(eq(mentoringTopics.id, id), eq(mentoringTopics.mentorId, mentorId))

    const [data] = await db
      .update(mentoringTopics)
      .set(updateData)
      .where(ownershipFilter)
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Tema nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toMentoringTopic(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params

    const ownershipFilter = profile.role === "admin"
      ? eq(mentoringTopics.id, id)
      : and(eq(mentoringTopics.id, id), eq(mentoringTopics.mentorId, mentorId))

    await db.delete(mentoringTopics).where(ownershipFilter)

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
