import { and, count, eq, sql } from "drizzle-orm"
import { db, simScoreEvents, simSprintTasks, type SimSprint } from "@/lib/db"
import { getSprintDay } from "@/lib/sim/sprint-day"

/**
 * Pontuação de metodologia ágil (categoria "agile"): premia o *comportamento*
 * ágil — fazer a daily, sinalizar impedimento, respeitar o WIP limit, entregar
 * pelo fluxo do Kanban e bater a meta da sprint. Reforço positivo apenas
 * (sem penalidades) para não desmotivar quem está aprendendo SCRUM.
 *
 * Idempotência: cada evento tem um `event_key` estável e é inserido com
 * ON CONFLICT DO NOTHING no índice único (sprint_id, event_key). Assim cada
 * comportamento pontua uma única vez, mesmo com polling/reenvio.
 */

export const AGILE_POINTS = {
  /** Fez a daily do dia (registro de progresso do standup). */
  daily: 5,
  /** Sinalizou um impedimento (transparência é pilar do SCRUM). */
  impediment: 3,
  /** Enviou uma task para review mantendo o foco (WIP ≤ 1 em Doing). */
  flowReview: 4,
  /** Task aprovada pelo Tech Lead (entrega concluída). */
  delivered: 6,
  /** Bateu a meta da sprint (todas as tasks em Done). */
  sprintGoal: 15,
} as const

interface AwardParams {
  sprintId: string
  eventKey: string
  delta: number
  reason: string
  sprintDay: number
  taskId?: string | null
}

/** Insere um evento ágil idempotente (uma vez por sprint + event_key). */
export async function awardAgileEvent(params: AwardParams): Promise<void> {
  await db
    .insert(simScoreEvents)
    .values({
      sprintId: params.sprintId,
      taskId: params.taskId ?? null,
      source: "auto",
      category: "agile",
      delta: params.delta,
      reason: params.reason,
      sprintDay: params.sprintDay,
      eventKey: params.eventKey,
    })
    .onConflictDoNothing({
      target: [simScoreEvents.sprintId, simScoreEvents.eventKey],
    })
}

/** Daily do dia: primeira mensagem de progresso do dia pontua. */
export async function awardDailyStandup(sprint: SimSprint): Promise<void> {
  const day = getSprintDay(sprint.startedAt, sprint.durationDays)
  await awardAgileEvent({
    sprintId: sprint.id,
    eventKey: `daily:${day}`,
    delta: AGILE_POINTS.daily,
    reason: "Daily feita: você comunicou seu progresso no standup",
    sprintDay: day,
  })
}

/** Impedimento sinalizado no dia (1x/dia): transparência do time. */
export async function awardImpediment(sprint: SimSprint): Promise<void> {
  const day = getSprintDay(sprint.startedAt, sprint.durationDays)
  await awardAgileEvent({
    sprintId: sprint.id,
    eventKey: `impediment:${day}`,
    delta: AGILE_POINTS.impediment,
    reason: "Impedimento sinalizado cedo — transparência é um pilar do SCRUM",
    sprintDay: day,
  })
}

/**
 * Enviou uma task para review. Bônus de foco quando respeitou o WIP limit
 * (no máx. 1 task em Doing no momento do envio). Chamar ANTES de mover o card.
 */
export async function awardFlowToReview(params: {
  sprint: SimSprint
  taskId: string
}): Promise<void> {
  const { sprint, taskId } = params
  const day = getSprintDay(sprint.startedAt, sprint.durationDays)
  const [doing] = await db
    .select({ value: count() })
    .from(simSprintTasks)
    .where(
      and(
        eq(simSprintTasks.sprintId, sprint.id),
        eq(simSprintTasks.status, "doing"),
      ),
    )
  const focused = (doing?.value ?? 0) <= 1
  await awardAgileEvent({
    sprintId: sprint.id,
    taskId,
    eventKey: `flow-review:${taskId}`,
    delta: AGILE_POINTS.flowReview,
    reason: focused
      ? "Fluxo do Kanban: task enviada para review com foco (WIP respeitado)"
      : "Fluxo do Kanban: task enviada para review",
    sprintDay: day,
  })
}

/**
 * Task aprovada (review → done). Pontua a entrega e, se todas as tasks da
 * sprint ficaram em Done, concede o bônus de meta da sprint.
 */
export async function awardDelivery(params: {
  sprint: SimSprint
  taskId: string
}): Promise<void> {
  const { sprint, taskId } = params
  const day = getSprintDay(sprint.startedAt, sprint.durationDays)
  await awardAgileEvent({
    sprintId: sprint.id,
    taskId,
    eventKey: `done:${taskId}`,
    delta: AGILE_POINTS.delivered,
    reason: "Entrega aprovada pelo Tech Lead",
    sprintDay: day,
  })

  const [totals] = await db
    .select({
      total: count(),
      done: sql<number>`count(*) filter (where ${simSprintTasks.status} = 'done')`.mapWith(
        Number,
      ),
    })
    .from(simSprintTasks)
    .where(eq(simSprintTasks.sprintId, sprint.id))

  if (totals && totals.total > 0 && totals.total === totals.done) {
    await awardAgileEvent({
      sprintId: sprint.id,
      eventKey: "sprint-goal",
      delta: AGILE_POINTS.sprintGoal,
      reason: "Meta da sprint batida: todas as tasks concluídas 🎉",
      sprintDay: day,
    })
  }
}
