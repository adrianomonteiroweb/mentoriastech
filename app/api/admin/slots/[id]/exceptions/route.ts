import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, mentoringSlotExceptions, mentoringSlots } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params

    const ownerFilter =
      profile.role === "admin"
        ? eq(mentoringSlots.id, id)
        : and(eq(mentoringSlots.id, id), eq(mentoringSlots.mentorId, mentorId))

    const [slot] = await db.select({ id: mentoringSlots.id }).from(mentoringSlots).where(ownerFilter)
    if (!slot) return NextResponse.json({ error: "Horario nao encontrado" }, { status: 404 })

    const exceptions = await db
      .select()
      .from(mentoringSlotExceptions)
      .where(eq(mentoringSlotExceptions.slotId, id))
      .orderBy(asc(mentoringSlotExceptions.blockedDate))

    return NextResponse.json({
      data: exceptions.map((e) => ({
        id: e.id,
        slot_id: e.slotId,
        blocked_date: e.blockedDate,
        reason: e.reason,
        created_at: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const ownerFilter =
      profile.role === "admin"
        ? eq(mentoringSlots.id, id)
        : and(eq(mentoringSlots.id, id), eq(mentoringSlots.mentorId, mentorId))

    const [slot] = await db.select({ id: mentoringSlots.id }).from(mentoringSlots).where(ownerFilter)
    if (!slot) return NextResponse.json({ error: "Horario nao encontrado" }, { status: 404 })

    const [exception] = await db
      .insert(mentoringSlotExceptions)
      .values({
        slotId: id,
        blockedDate: parsed.data.blocked_date,
        reason: parsed.data.reason || null,
      })
      .onConflictDoNothing()
      .returning()

    return NextResponse.json(
      {
        data: exception
          ? {
              id: exception.id,
              slot_id: exception.slotId,
              blocked_date: exception.blockedDate,
              reason: exception.reason,
              created_at:
                exception.createdAt instanceof Date
                  ? exception.createdAt.toISOString()
                  : exception.createdAt,
            }
          : null,
      },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
