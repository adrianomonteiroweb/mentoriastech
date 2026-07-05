import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprintTasks, simSprints } from "@/lib/db"
import { getNextTaskNumber, toSimSprintTaskApi } from "@/lib/db/sim"
import { simTemplateTaskSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simTemplateTaskSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [sprint] = await db
      .select()
      .from(simSprints)
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    const taskNumber = await getNextTaskNumber(id)

    const [data] = await db
      .insert(simSprintTasks)
      .values({
        sprintId: id,
        taskNumber,
        title: parsed.data.title,
        description: parsed.data.description || null,
        taskType: parsed.data.task_type,
        points: parsed.data.points,
        status: parsed.data.initial_status,
        sortOrder: parsed.data.sort_order ?? 0,
        evaluationRules: parsed.data.evaluation_rules ?? null,
        createdBy: mentor.id,
      })
      .returning()

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: sprint.profileId,
      action: "sim_sprint_task_created",
      route: `/api/admin/sprints/${id}/tasks`,
      request,
      metadata: { taskId: data.id },
    })

    return NextResponse.json(
      { data: toSimSprintTaskApi(data) },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
