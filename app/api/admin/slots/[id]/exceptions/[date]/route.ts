import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, mentoringSlotExceptions, mentoringSlots } from "@/lib/db"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id, date } = await params

    const ownerFilter =
      profile.role === "admin"
        ? eq(mentoringSlots.id, id)
        : and(eq(mentoringSlots.id, id), eq(mentoringSlots.mentorId, mentorId))

    const [slot] = await db.select({ id: mentoringSlots.id }).from(mentoringSlots).where(ownerFilter)
    if (!slot) return NextResponse.json({ error: "Horario nao encontrado" }, { status: 404 })

    const deleted = await db
      .delete(mentoringSlotExceptions)
      .where(
        and(
          eq(mentoringSlotExceptions.slotId, id),
          eq(mentoringSlotExceptions.blockedDate, date),
        ),
      )
      .returning({ id: mentoringSlotExceptions.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Excecao nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
