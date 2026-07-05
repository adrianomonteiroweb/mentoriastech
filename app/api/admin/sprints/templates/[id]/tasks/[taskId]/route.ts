import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simTemplateTasks } from "@/lib/db"
import { toSimTemplateTaskApi } from "@/lib/db/sim"
import { simTemplateTaskSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id, taskId } = await params
    const body = await request.json()

    const parsed = simTemplateTaskSchema.partial().safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const updateData: Partial<typeof simTemplateTasks.$inferInsert> = {
      updatedAt: new Date(),
    }
    const d = parsed.data
    if (d.title !== undefined) updateData.title = d.title
    if (d.description !== undefined) updateData.description = d.description || null
    if (d.task_type !== undefined) updateData.taskType = d.task_type
    if (d.points !== undefined) updateData.points = d.points
    if (d.initial_status !== undefined) updateData.initialStatus = d.initial_status
    if (d.sort_order !== undefined) updateData.sortOrder = d.sort_order
    if (d.evaluation_rules !== undefined)
      updateData.evaluationRules = d.evaluation_rules
    if (d.solution_markdown !== undefined)
      updateData.solutionMarkdown = d.solution_markdown || null

    const [data] = await db
      .update(simTemplateTasks)
      .set(updateData)
      .where(
        and(eq(simTemplateTasks.id, taskId), eq(simTemplateTasks.templateId, id)),
      )
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Task nao encontrada" }, { status: 404 })
    }

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_task_updated",
      route: `/api/admin/sprints/templates/${id}/tasks/${taskId}`,
      request,
    })

    return NextResponse.json({ data: toSimTemplateTaskApi(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id, taskId } = await params

    await db
      .delete(simTemplateTasks)
      .where(
        and(eq(simTemplateTasks.id, taskId), eq(simTemplateTasks.templateId, id)),
      )

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_task_deleted",
      route: `/api/admin/sprints/templates/${id}/tasks/${taskId}`,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
