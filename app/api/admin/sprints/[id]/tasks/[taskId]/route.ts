import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprintTasks, simSprints } from "@/lib/db"
import { moveSprintTask, toSimSprintTaskApi } from "@/lib/db/sim"
import { awardDelivery } from "@/lib/sim/agile-scoring"
import { simMoveTaskSchema, simSprintTaskUpdateSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

async function loadSprintAndTask(sprintId: string, taskId: string) {
  const [sprint] = await db
    .select()
    .from(simSprints)
    .where(eq(simSprints.id, sprintId))
    .limit(1)
  if (!sprint) return { sprint: null, task: null }

  const [task] = await db
    .select()
    .from(simSprintTasks)
    .where(
      and(eq(simSprintTasks.id, taskId), eq(simSprintTasks.sprintId, sprintId)),
    )
    .limit(1)

  return { sprint, task: task || null }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id, taskId } = await params
    const body = await request.json()

    const parsed = simMoveTaskSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { sprint, task } = await loadSprintAndTask(id, taskId)
    if (!sprint || !task) {
      return NextResponse.json({ error: "Task nao encontrada" }, { status: 404 })
    }

    const updated = await moveSprintTask({
      sprint,
      task,
      toStatus: parsed.data.to_status,
      sortOrder: parsed.data.sort_order,
      actorRole: "mentor",
      actorId: mentor.id,
    })

    // Entrega aprovada (review → done): pontua a entrega + bônus de meta da sprint.
    if (parsed.data.to_status === "done" && task.status !== "done") {
      await awardDelivery({ sprint, taskId })
    }

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: sprint.profileId,
      action: "sim_task_moved_by_mentor",
      route: `/api/admin/sprints/${id}/tasks/${taskId}`,
      request,
      metadata: { from: task.status, to: parsed.data.to_status },
    })

    return NextResponse.json({ data: toSimSprintTaskApi(updated) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id, taskId } = await params
    const body = await request.json()

    const parsed = simSprintTaskUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const updateData: Partial<typeof simSprintTasks.$inferInsert> = {
      updatedAt: new Date(),
    }
    const d = parsed.data
    if (d.title !== undefined) updateData.title = d.title
    if (d.description !== undefined) updateData.description = d.description || null
    if (d.task_type !== undefined) updateData.taskType = d.task_type
    if (d.points !== undefined) updateData.points = d.points
    if (d.sort_order !== undefined) updateData.sortOrder = d.sort_order
    if (d.evaluation_rules !== undefined)
      updateData.evaluationRules = d.evaluation_rules
    if (d.solution_markdown !== undefined)
      updateData.solutionMarkdown = d.solution_markdown || null
    if (d.solution_released !== undefined)
      updateData.solutionReleasedAt = d.solution_released ? new Date() : null

    const [data] = await db
      .update(simSprintTasks)
      .set(updateData)
      .where(
        and(eq(simSprintTasks.id, taskId), eq(simSprintTasks.sprintId, id)),
      )
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Task nao encontrada" }, { status: 404 })
    }

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_sprint_task_updated",
      route: `/api/admin/sprints/${id}/tasks/${taskId}`,
      request,
    })

    return NextResponse.json({
      data: toSimSprintTaskApi(data, { revealSolution: true }),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
