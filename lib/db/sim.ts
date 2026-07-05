import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { randomUUID } from "crypto"
import {
  db,
  profiles,
  simApplications,
  simDailyMessages,
  simScoreEvents,
  simSprintTasks,
  simSprints,
  simTaskTransitions,
  type SimApplication,
  type SimCompany,
  type SimDailyMessage,
  type SimScoreEvent,
  type SimSprint,
  type SimSprintTask,
  type SimSprintTemplate,
  type SimTemplateTask,
} from "@/lib/db"
import { getSprintDay } from "@/lib/sim/sprint-day"
import {
  SIM_TASK_STATUS_LABELS,
  canTransition,
} from "@/lib/sim/task-transitions"
import type {
  SimApplicationApi,
  SimCompanyApi,
  SimDailyMessageApi,
  SimScoreEventApi,
  SimSprintApi,
  SimSprintTaskApi,
  SimSprintTemplateApi,
  SimTemplateTaskApi,
} from "@/lib/types/database"

/**
 * Helpers de consulta e mapeamento do Sprint Simulator (padrão de
 * lib/db/mentee-opportunities.ts): mantém as rotas de API finas.
 */

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

// ---------------------------------------------------------------------------
// Mappers → shapes snake_case da API
// ---------------------------------------------------------------------------

export function toSimCompanyApi(c: SimCompany): SimCompanyApi {
  return {
    id: c.id,
    name: c.name,
    archetype: c.archetype,
    description: c.description,
    product_description: c.productDescription,
    client_description: c.clientDescription,
    service_description: c.serviceDescription,
    process_description: c.processDescription,
    po_doc_markdown: c.poDocMarkdown,
    pm_doc_markdown: c.pmDocMarkdown,
    tech_lead_doc_markdown: c.techLeadDocMarkdown,
    is_active: c.isActive,
    created_at: toIso(c.createdAt) || "",
    updated_at: toIso(c.updatedAt) || "",
  }
}

export function toSimTemplateTaskApi(t: SimTemplateTask): SimTemplateTaskApi {
  return {
    id: t.id,
    template_id: t.templateId,
    title: t.title,
    description: t.description,
    task_type: t.taskType,
    points: t.points,
    initial_status: t.initialStatus,
    sort_order: t.sortOrder,
    evaluation_rules: t.evaluationRules ?? null,
    solution_markdown: t.solutionMarkdown ?? null,
    created_at: toIso(t.createdAt) || "",
  }
}

export function toSimTemplateApi(
  t: SimSprintTemplate,
  extras?: {
    company?: Pick<SimCompanyApi, "id" | "name" | "archetype"> | null
    tasks?: SimTemplateTaskApi[]
    task_count?: number
    my_application_status?: SimApplicationApi["status"] | null
  },
): SimSprintTemplateApi {
  return {
    id: t.id,
    company_id: t.companyId,
    title: t.title,
    objective: t.objective,
    level: t.level,
    duration_days: t.durationDays,
    is_active: t.isActive,
    sort_order: t.sortOrder,
    created_at: toIso(t.createdAt) || "",
    ...extras,
  }
}

export function toSimApplicationApi(
  a: SimApplication,
  extras?: {
    template?: SimApplicationApi["template"]
    company?: SimApplicationApi["company"]
    mentee?: SimApplicationApi["mentee"]
  },
): SimApplicationApi {
  return {
    id: a.id,
    profile_id: a.profileId,
    template_id: a.templateId,
    message: a.message,
    status: a.status,
    reviewed_at: toIso(a.reviewedAt),
    review_note: a.reviewNote,
    created_at: toIso(a.createdAt) || "",
    ...extras,
  }
}

export function toSimSprintTaskApi(
  t: SimSprintTask,
  opts?: { revealSolution?: boolean },
): SimSprintTaskApi {
  return {
    id: t.id,
    sprint_id: t.sprintId,
    task_number: t.taskNumber,
    title: t.title,
    description: t.description,
    task_type: t.taskType,
    points: t.points,
    status: t.status,
    sort_order: t.sortOrder,
    has_rules: Boolean(t.evaluationRules && t.evaluationRules.length > 0),
    last_evaluation: t.lastEvaluation ?? null,
    // Segurança: o conteúdo do gabarito só sai quando revealSolution=true
    // (mentee: apenas se liberado; mentor: sempre).
    solution_released: Boolean(t.solutionReleasedAt),
    solution_markdown: opts?.revealSolution ? (t.solutionMarkdown ?? null) : null,
    submitted_at: toIso(t.submittedAt),
    approved_at: toIso(t.approvedAt),
    created_at: toIso(t.createdAt) || "",
  }
}

export function toSimScoreEventApi(e: SimScoreEvent): SimScoreEventApi {
  return {
    id: e.id,
    sprint_id: e.sprintId,
    task_id: e.taskId,
    message_id: e.messageId,
    source: e.source,
    category: e.category,
    delta: e.delta,
    reason: e.reason,
    sprint_day: e.sprintDay,
    event_key: e.eventKey ?? null,
    created_at: toIso(e.createdAt) || "",
  }
}

export function toSimDailyMessageApi(
  m: SimDailyMessage,
  extras?: {
    author_name?: string | null
    task_number?: number | null
    score_event?: SimDailyMessageApi["score_event"]
  },
): SimDailyMessageApi {
  return {
    id: m.id,
    sprint_id: m.sprintId,
    author_role: m.authorRole,
    kind: m.kind,
    author_name: extras?.author_name ?? null,
    body: m.body,
    task_id: m.taskId,
    task_number: extras?.task_number ?? null,
    sprint_day: m.sprintDay,
    read_at: toIso(m.readAt),
    created_at: toIso(m.createdAt) || "",
    score_event: extras?.score_event ?? null,
  }
}

export function toSimSprintApi(
  s: SimSprint,
  extras?: {
    company?: SimSprintApi["company"]
    total_score?: number
    done_count?: number
    task_count?: number
    unread_count?: number
    doubt_count?: number
  },
): SimSprintApi {
  return {
    id: s.id,
    profile_id: s.profileId,
    title: s.title,
    objective: s.objective,
    duration_days: s.durationDays,
    current_day: getSprintDay(s.startedAt, s.durationDays),
    status: s.status,
    started_at: toIso(s.startedAt) || "",
    ended_at: toIso(s.endedAt),
    final_score: s.finalScore,
    final_feedback: s.finalFeedback,
    created_at: toIso(s.createdAt) || "",
    ...extras,
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function getActiveSprintForProfile(
  profileId: string,
): Promise<SimSprint | null> {
  const [row] = await db
    .select()
    .from(simSprints)
    .where(
      and(eq(simSprints.profileId, profileId), eq(simSprints.status, "active")),
    )
    .limit(1)
  return row || null
}

export async function hasPendingApplication(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: simApplications.id })
    .from(simApplications)
    .where(
      and(
        eq(simApplications.profileId, profileId),
        eq(simApplications.status, "pending"),
      ),
    )
    .limit(1)
  return Boolean(row)
}

/** Sprint pertencente ao mentorado (ownership) ou null. */
export async function getSprintOwnedByProfile(
  sprintId: string,
  profileId: string,
): Promise<SimSprint | null> {
  const [row] = await db
    .select()
    .from(simSprints)
    .where(and(eq(simSprints.id, sprintId), eq(simSprints.profileId, profileId)))
    .limit(1)
  return row || null
}

export async function getSprintScoreTotal(sprintId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${simScoreEvents.delta}), 0)`.mapWith(
        Number,
      ),
    })
    .from(simScoreEvents)
    .where(
      and(
        eq(simScoreEvents.sprintId, sprintId),
        isNull(simScoreEvents.supersededAt),
      ),
    )
  return row?.total ?? 0
}

/** Totais de pontuação por sprint (não-supersedados). */
export async function getScoreTotals(
  sprintIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (sprintIds.length === 0) return map
  const rows = await db
    .select({
      sprintId: simScoreEvents.sprintId,
      total: sql<number>`coalesce(sum(${simScoreEvents.delta}), 0)`.mapWith(
        Number,
      ),
    })
    .from(simScoreEvents)
    .where(
      and(
        inArray(simScoreEvents.sprintId, sprintIds),
        isNull(simScoreEvents.supersededAt),
      ),
    )
    .groupBy(simScoreEvents.sprintId)
  for (const row of rows) map.set(row.sprintId, row.total)
  return map
}

/** Contagem de tasks (done/total) por sprint. */
export async function getTaskCounts(
  sprintIds: string[],
): Promise<Map<string, { done: number; total: number }>> {
  const map = new Map<string, { done: number; total: number }>()
  if (sprintIds.length === 0) return map
  const rows = await db
    .select({
      sprintId: simSprintTasks.sprintId,
      total: sql<number>`count(*)`.mapWith(Number),
      done: sql<number>`count(*) filter (where ${simSprintTasks.status} = 'done')`.mapWith(
        Number,
      ),
    })
    .from(simSprintTasks)
    .where(inArray(simSprintTasks.sprintId, sprintIds))
    .groupBy(simSprintTasks.sprintId)
  for (const row of rows) map.set(row.sprintId, { done: row.done, total: row.total })
  return map
}

/**
 * Mensagens não lidas por sprint, escritas por `authorRole`
 * (mentee lê não-lidas do mentor e vice-versa).
 */
export async function getUnreadCounts(
  sprintIds: string[],
  authorRole: "mentee" | "mentor",
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (sprintIds.length === 0) return map
  const rows = await db
    .select({
      sprintId: simDailyMessages.sprintId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(simDailyMessages)
    .where(
      and(
        inArray(simDailyMessages.sprintId, sprintIds),
        eq(simDailyMessages.authorRole, authorRole),
        isNull(simDailyMessages.readAt),
      ),
    )
    .groupBy(simDailyMessages.sprintId)
  for (const row of rows) map.set(row.sprintId, row.count)
  return map
}

export async function getActionableUnreadCounts(
  sprintIds: string[],
  authorRole: "mentee" | "mentor",
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (sprintIds.length === 0) return map
  const rows = await db
    .select({
      sprintId: simDailyMessages.sprintId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(simDailyMessages)
    .where(
      and(
        inArray(simDailyMessages.sprintId, sprintIds),
        eq(simDailyMessages.authorRole, authorRole),
        isNull(simDailyMessages.readAt),
        inArray(simDailyMessages.kind, ["doubt", "impediment"]),
      ),
    )
    .groupBy(simDailyMessages.sprintId)
  for (const row of rows) map.set(row.sprintId, row.count)
  return map
}

/** Última atividade (transição ou mensagem) por sprint. */
export async function getLastActivityAt(
  sprintIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (sprintIds.length === 0) return map

  const transitions = await db
    .select({
      sprintId: simTaskTransitions.sprintId,
      last: sql<string>`max(${simTaskTransitions.createdAt})`,
    })
    .from(simTaskTransitions)
    .where(inArray(simTaskTransitions.sprintId, sprintIds))
    .groupBy(simTaskTransitions.sprintId)

  const messages = await db
    .select({
      sprintId: simDailyMessages.sprintId,
      last: sql<string>`max(${simDailyMessages.createdAt})`,
    })
    .from(simDailyMessages)
    .where(inArray(simDailyMessages.sprintId, sprintIds))
    .groupBy(simDailyMessages.sprintId)

  for (const row of [...transitions, ...messages]) {
    const iso = new Date(row.last).toISOString()
    const current = map.get(row.sprintId)
    if (!current || iso > current) map.set(row.sprintId, iso)
  }
  return map
}

/** Próximo número sequencial de task da sprint (max + 1). */
export async function getNextTaskNumber(sprintId: string): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number>`coalesce(max(${simSprintTasks.taskNumber}), 0)`.mapWith(
        Number,
      ),
    })
    .from(simSprintTasks)
    .where(eq(simSprintTasks.sprintId, sprintId))
  return (row?.max ?? 0) + 1
}

/**
 * Mensagens da sprint no shape da API: com nome do autor, número da task
 * referenciada e ajuste de pontuação anexado (quando houver).
 */
export async function getSprintMessagesApi(
  sprintId: string,
): Promise<SimDailyMessageApi[]> {
  const rows = await db
    .select({
      message: simDailyMessages,
      authorName: profiles.fullName,
      taskNumber: simSprintTasks.taskNumber,
    })
    .from(simDailyMessages)
    .leftJoin(profiles, eq(simDailyMessages.authorId, profiles.id))
    .leftJoin(simSprintTasks, eq(simDailyMessages.taskId, simSprintTasks.id))
    .where(eq(simDailyMessages.sprintId, sprintId))
    .orderBy(simDailyMessages.createdAt)

  const messageIds = rows.map((row) => row.message.id)
  const adjustments = new Map<
    string,
    Pick<SimScoreEventApi, "id" | "delta" | "reason" | "category">
  >()
  if (messageIds.length > 0) {
    const events = await db
      .select()
      .from(simScoreEvents)
      .where(inArray(simScoreEvents.messageId, messageIds))
    for (const event of events) {
      if (!event.messageId) continue
      adjustments.set(event.messageId, {
        id: event.id,
        delta: event.delta,
        reason: event.reason,
        category: event.category,
      })
    }
  }

  return rows.map((row) =>
    toSimDailyMessageApi(row.message, {
      author_name: row.authorName,
      task_number: row.taskNumber,
      score_event: adjustments.get(row.message.id) ?? null,
    }),
  )
}

/**
 * Marca como lidas as mensagens escritas por `authorRole`
 * (chamado pela contraparte ao abrir o chat).
 */
export async function markMessagesRead(
  sprintId: string,
  authorRole: "mentee" | "mentor",
): Promise<void> {
  await db
    .update(simDailyMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(simDailyMessages.sprintId, sprintId),
        eq(simDailyMessages.authorRole, authorRole),
        isNull(simDailyMessages.readAt),
      ),
    )
}

/** Ledger de pontuação (não-supersedado), mais recente primeiro. */
export async function getSprintScoreEvents(sprintId: string) {
  return db
    .select()
    .from(simScoreEvents)
    .where(
      and(
        eq(simScoreEvents.sprintId, sprintId),
        isNull(simScoreEvents.supersededAt),
      ),
    )
    .orderBy(desc(simScoreEvents.createdAt))
}

// ---------------------------------------------------------------------------
// Movimentação de task no kanban (validação + histórico)
// ---------------------------------------------------------------------------

export class SimMoveError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "SimMoveError"
    this.status = status
  }
}

/**
 * Move a task validando o mapa de transições do papel e registrando o
 * histórico. Lança SimMoveError (400/409) para movimentos ilegais.
 */
export async function moveSprintTask(params: {
  sprint: SimSprint
  task: SimSprintTask
  toStatus: SimSprintTask["status"]
  sortOrder?: number
  actorRole: "mentee" | "mentor"
  actorId: string | null
}): Promise<SimSprintTask> {
  const { sprint, task, toStatus, sortOrder, actorRole, actorId } = params

  if (sprint.status !== "active") {
    throw new SimMoveError("Sprint nao esta mais ativa", 409)
  }

  if (task.status === toStatus) {
    if (sortOrder === undefined) return task
  } else if (!canTransition(actorRole, task.status, toStatus)) {
    const label = SIM_TASK_STATUS_LABELS[toStatus]
    throw new SimMoveError(
      `Movimento nao permitido: ${SIM_TASK_STATUS_LABELS[task.status]} → ${label}`,
      400,
    )
  }

  const now = new Date()
  const updateData: Partial<typeof simSprintTasks.$inferInsert> = {
    status: toStatus,
    updatedAt: now,
  }
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder
  if (toStatus === "review" && task.status !== "review") {
    updateData.submittedAt = now
  }
  if (toStatus === "done" && task.status !== "done") {
    updateData.approvedAt = now
  }
  if (task.status === "done" && toStatus !== "done") {
    updateData.approvedAt = null
  }

  const [updated] = await db
    .update(simSprintTasks)
    .set(updateData)
    .where(eq(simSprintTasks.id, task.id))
    .returning()

  if (task.status !== toStatus) {
    await db.insert(simTaskTransitions).values({
      taskId: task.id,
      sprintId: sprint.id,
      fromStatus: task.status,
      toStatus,
      actorRole,
      actorId,
      sprintDay: getSprintDay(sprint.startedAt, sprint.durationDays),
    })
  }

  return updated
}

// ---------------------------------------------------------------------------
// Aprovação de candidatura → instanciar sprint (snapshot do template)
// ---------------------------------------------------------------------------

/**
 * Cria a sprint e semeia as tasks a partir do template. O driver neon-http
 * não suporta transações interativas, então o UUID da sprint é pré-gerado e
 * as escritas vão em um único db.batch (atômico no Neon).
 */
export async function createSprintFromApplication(params: {
  application: SimApplication
  template: SimSprintTemplate
  templateTasks: SimTemplateTask[]
  mentorId: string
}): Promise<string> {
  const { application, template, templateTasks, mentorId } = params
  const sprintId = randomUUID()
  const now = new Date()

  const approveApplication = db
    .update(simApplications)
    .set({
      status: "approved" as const,
      reviewedBy: mentorId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(simApplications.id, application.id))

  const insertSprint = db.insert(simSprints).values({
    id: sprintId,
    profileId: application.profileId,
    applicationId: application.id,
    templateId: template.id,
    companyId: template.companyId,
    mentorId,
    title: template.title,
    objective: template.objective,
    durationDays: template.durationDays,
    status: "active" as const,
    startedAt: now,
  })

  const orderedTasks = [...templateTasks].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  if (orderedTasks.length > 0) {
    const insertTasks = db.insert(simSprintTasks).values(
      orderedTasks.map((task, index) => ({
        sprintId,
        templateTaskId: task.id,
        taskNumber: index + 1,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        points: task.points,
        status: task.initialStatus,
        sortOrder: task.sortOrder,
        evaluationRules: task.evaluationRules,
        solutionMarkdown: task.solutionMarkdown,
      })),
    )
    await db.batch([approveApplication, insertSprint, insertTasks])
  } else {
    await db.batch([approveApplication, insertSprint])
  }

  return sprintId
}
