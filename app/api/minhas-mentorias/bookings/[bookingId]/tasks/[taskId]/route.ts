import { NextResponse } from "next/server"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getMenteeBookingByIdForEmail } from "@/lib/db/mentee-bookings"
import { getTaskById, updateTask } from "@/lib/db/booking-tasks"

interface RouteContext {
  params: Promise<{ bookingId: string; taskId: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getMenteeAccessSession()
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }

  const { bookingId, taskId } = await context.params

  const booking = await getMenteeBookingByIdForEmail(bookingId, session.email)
  if (!booking) {
    return NextResponse.json({ error: "Mentoria nao encontrada" }, { status: 404 })
  }

  const task = await getTaskById(taskId)
  if (!task || task.bookingId !== bookingId) {
    return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 })
  }

  const body = await request.json()
  const completed = typeof body.completed === "boolean" ? body.completed : undefined
  if (completed === undefined) {
    return NextResponse.json({ error: "Campo 'completed' obrigatorio" }, { status: 400 })
  }

  const updated = await updateTask(taskId, { completed })

  return NextResponse.json({ data: updated })
}
