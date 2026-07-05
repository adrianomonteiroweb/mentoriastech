import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprintTasks, simSprints } from "@/lib/db"
import { toSimSprintTaskApi } from "@/lib/db/sim"
import { runTaskEvaluation } from "@/lib/sim/run-evaluation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

/** Reexecuta a avaliação automática da task (mentor). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id, taskId } = await params

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

    const [task] = await db
      .select()
      .from(simSprintTasks)
      .where(
        and(eq(simSprintTasks.id, taskId), eq(simSprintTasks.sprintId, id)),
      )
      .limit(1)

    if (!task) {
      return NextResponse.json({ error: "Task nao encontrada" }, { status: 404 })
    }

    const result = await runTaskEvaluation({ sprint, task })
    if (!result) {
      return NextResponse.json(
        { error: "Task sem regras de avaliacao configuradas" },
        { status: 409 },
      )
    }

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: sprint.profileId,
      action: "sim_task_reevaluated",
      route: `/api/admin/sprints/${id}/tasks/${taskId}/evaluate`,
      request,
      metadata: { scoreDelta: result.scoreDelta },
    })

    return NextResponse.json({
      data: toSimSprintTaskApi({ ...task, lastEvaluation: result.evaluation }),
      evaluation: result.evaluation,
      score_delta: result.scoreDelta,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
