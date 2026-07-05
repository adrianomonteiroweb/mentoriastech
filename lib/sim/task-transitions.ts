/**
 * Mapa de transições do kanban por papel — fonte única de verdade,
 * usado tanto na validação server-side (rotas de API) quanto na UI
 * (menu "Mover" exibe apenas os destinos permitidos).
 */

export const SIM_TASK_STATUSES = [
  "backlog",
  "todo",
  "doing",
  "review",
  "done",
] as const

export type SimTaskStatus = (typeof SIM_TASK_STATUSES)[number]

export const SIM_TASK_STATUS_LABELS: Record<SimTaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  doing: "Doing",
  review: "Review",
  done: "Done",
}

export type SimActorRole = "mentee" | "mentor"

const MENTEE_TRANSITIONS: Record<SimTaskStatus, SimTaskStatus[]> = {
  backlog: ["todo"],
  todo: ["backlog", "doing"],
  doing: ["todo", "review"],
  review: [],
  done: [],
}

// Mentor pode tudo que o mentee pode + aprovar (review→done),
// solicitar ajustes (review→doing) e reabrir (done→doing).
const MENTOR_TRANSITIONS: Record<SimTaskStatus, SimTaskStatus[]> = {
  backlog: ["todo"],
  todo: ["backlog", "doing"],
  doing: ["todo", "review"],
  review: ["doing", "done"],
  done: ["doing"],
}

export function getAllowedTransitions(
  role: SimActorRole,
  from: SimTaskStatus,
): SimTaskStatus[] {
  const map = role === "mentor" ? MENTOR_TRANSITIONS : MENTEE_TRANSITIONS
  return map[from] ?? []
}

export function canTransition(
  role: SimActorRole,
  from: SimTaskStatus,
  to: SimTaskStatus,
): boolean {
  return getAllowedTransitions(role, from).includes(to)
}
