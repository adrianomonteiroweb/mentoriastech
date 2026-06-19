import { NextResponse } from "next/server"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { getTaskById, deleteTaskItem } from "@/lib/db/booking-tasks"
import { deleteFile } from "@/lib/utils/upload"

interface RouteContext {
  params: Promise<{ id: string; taskId: string; itemId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { id: bookingId, taskId, itemId } = await context.params

    const task = await getTaskById(taskId)
    if (!task || task.bookingId !== bookingId) {
      return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 })
    }

    const item = await deleteTaskItem(itemId)
    if (!item) {
      return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 })
    }

    if (item.fileUrl) {
      try {
        await deleteFile(item.fileUrl)
      } catch {
        // best-effort cleanup
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
