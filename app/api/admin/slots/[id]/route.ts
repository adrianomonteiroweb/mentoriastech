import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, mentoringSlots } from "@/lib/db"
import { toMentoringSlot } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  day_of_week: z.number().min(0).max(6).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slot_type: z.enum(["free", "paid", "private"]).optional(),
  is_active: z.boolean().optional(),
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

    const updateData: Partial<typeof mentoringSlots.$inferInsert> = {}

    if (parsed.data.day_of_week !== undefined) updateData.dayOfWeek = parsed.data.day_of_week
    if (parsed.data.start_time !== undefined) updateData.startTime = parsed.data.start_time + ":00"
    if (parsed.data.slot_type !== undefined) updateData.slotType = parsed.data.slot_type
    if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active

    const ownershipFilter = profile.role === "admin"
      ? eq(mentoringSlots.id, id)
      : and(eq(mentoringSlots.id, id), eq(mentoringSlots.mentorId, mentorId))

    const [data] = await db
      .update(mentoringSlots)
      .set(updateData)
      .where(ownershipFilter)
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Horario nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toMentoringSlot(data) })
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
      ? eq(mentoringSlots.id, id)
      : and(eq(mentoringSlots.id, id), eq(mentoringSlots.mentorId, mentorId))

    await db.delete(mentoringSlots).where(ownershipFilter)

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
