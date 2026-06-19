import { NextResponse } from "next/server"
import { z } from "zod"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { getTaskById, updateTask, deleteTask } from "@/lib/db/booking-tasks"

interface RouteContext {
  params: Promise<{ id: string; taskId: string }>
}

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { taskId } = await context.params

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const task = await updateTask(taskId, {
      title: parsed.data.title,
      completed: parsed.data.completed,
      sortOrder: parsed.data.sort_order,
    })

    if (!task) {
      return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { taskId } = await context.params

    const task = await deleteTask(taskId)
    if (!task) {
      return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
