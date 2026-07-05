/**
 * Dia corrente da sprint, derivado de startedAt — sem coluna nem cron.
 * Dia 1 = data de início; nunca passa de durationDays (sprint "vencida"
 * continua exibindo o último dia até o mentor encerrar).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getSprintDay(
  startedAt: Date | string,
  durationDays: number,
  now: Date = new Date(),
): number {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt)
  const elapsed = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY)
  const day = elapsed + 1
  if (day < 1) return 1
  if (day > durationDays) return durationDays
  return day
}

export function isSprintOverdue(
  startedAt: Date | string,
  durationDays: number,
  now: Date = new Date(),
): boolean {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt)
  const elapsed = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY)
  return elapsed + 1 > durationDays
}
