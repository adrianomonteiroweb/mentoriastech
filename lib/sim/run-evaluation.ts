import { and, eq, isNull } from "drizzle-orm"
import {
  db,
  simScoreEvents,
  simSprintTasks,
  simWorkspaceFiles,
  type SimSprint,
  type SimSprintTask,
} from "@/lib/db"
import { evaluate } from "@/lib/sim/evaluation"
import { getSprintDay } from "@/lib/sim/sprint-day"
import type { SimEvaluationResult } from "@/lib/sim/evaluation-types"

/**
 * Executa a avaliação automática de uma task contra o workspace da sprint
 * e persiste o resultado:
 * 1. grava `last_evaluation` na task (checklist ✔/⚠ da UI);
 * 2. superseda eventos auto anteriores da task (re-submissão substitui,
 *    nunca acumula);
 * 3. insere UM evento auto no ledger com o delta proporcional aos pesos.
 *
 * Retorna null quando a task não tem regras configuradas.
 */
export async function runTaskEvaluation(params: {
  sprint: SimSprint
  task: SimSprintTask
}): Promise<{ evaluation: SimEvaluationResult; scoreDelta: number } | null> {
  const { sprint, task } = params
  const rules = task.evaluationRules
  if (!rules || rules.length === 0) return null

  const files = await db
    .select({
      path: simWorkspaceFiles.path,
      isFolder: simWorkspaceFiles.isFolder,
      content: simWorkspaceFiles.content,
    })
    .from(simWorkspaceFiles)
    .where(eq(simWorkspaceFiles.sprintId, sprint.id))

  const evaluation = evaluate(files, rules)
  const scoreDelta =
    evaluation.totalWeight > 0
      ? Math.round(
          task.points * (evaluation.passedWeight / evaluation.totalWeight),
        )
      : 0

  const passedCount = evaluation.results.filter((r) => r.passed).length
  const now = new Date()

  await db
    .update(simSprintTasks)
    .set({ lastEvaluation: evaluation, updatedAt: now })
    .where(eq(simSprintTasks.id, task.id))

  // Só supersede eventos da avaliação de código (category "general"); os
  // eventos ágeis (category "agile") também têm taskId e NÃO podem ser apagados.
  await db
    .update(simScoreEvents)
    .set({ supersededAt: now })
    .where(
      and(
        eq(simScoreEvents.taskId, task.id),
        eq(simScoreEvents.source, "auto"),
        eq(simScoreEvents.category, "general"),
        isNull(simScoreEvents.supersededAt),
      ),
    )

  await db.insert(simScoreEvents).values({
    sprintId: sprint.id,
    taskId: task.id,
    source: "auto",
    category: "general",
    delta: scoreDelta,
    reason: `Avaliação automática: ${passedCount} de ${evaluation.results.length} critérios atendidos`,
    sprintDay: getSprintDay(sprint.startedAt, sprint.durationDays),
  })

  return { evaluation, scoreDelta }
}
