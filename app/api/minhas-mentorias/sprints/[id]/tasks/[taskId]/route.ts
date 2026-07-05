import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprintTasks } from "@/lib/db"
import {
  getSprintOwnedByProfile,
  moveSprintTask,
  toSimSprintTaskApi,
} from "@/lib/db/sim"
import { runTaskEvaluation } from "@/lib/sim/run-evaluation"
import { simMoveTaskSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Mover card no kanban (transições do papel mentee validadas no servidor). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id, taskId } = await params
    const body = await request.json()

    const parsed = simMoveTaskSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const sprint = await getSprintOwnedByProfile(id, profile.id)
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

    const updated = await moveSprintTask({
      sprint,
      task,
      toStatus: parsed.data.to_status,
      sortOrder: parsed.data.sort_order,
      actorRole: "mentee",
      actorId: profile.id,
    })

    // Enviar para review dispara a avaliação automática (feedback imediato)
    let evaluationResult = null
    if (parsed.data.to_status === "review" && task.status !== "review") {
      evaluationResult = await runTaskEvaluation({ sprint, task: updated })
    }

    await logAuditEvent({
      actorId: profile.id,
      action: "sim_task_moved_by_mentee",
      route: `/api/minhas-mentorias/sprints/${id}/tasks/${taskId}`,
      request,
      metadata: { from: task.status, to: parsed.data.to_status },
    })

    return NextResponse.json({
      data: toSimSprintTaskApi(
        evaluationResult
          ? { ...updated, lastEvaluation: evaluationResult.evaluation }
          : updated,
      ),
      evaluation: evaluationResult?.evaluation ?? null,
      score_delta: evaluationResult?.scoreDelta ?? null,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
