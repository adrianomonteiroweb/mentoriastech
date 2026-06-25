export const MAX_JOB_ACTIVE_HOURS = 87_600

const HOUR_IN_MS = 60 * 60 * 1000

export function getJobSourcePostedAt(activeHours: number, now = new Date()): Date {
  return new Date(now.getTime() - activeHours * HOUR_IN_MS)
}

export function getJobActiveHours(
  sourcePostedAt: string | Date,
  now = Date.now(),
): number {
  const postedAt = new Date(sourcePostedAt).getTime()

  if (!Number.isFinite(postedAt)) return 0

  return Math.max(0, Math.floor((now - postedAt) / HOUR_IN_MS))
}

export function formatJobActiveHours(activeHours: number): string {
  if (activeHours < 24) {
    return `Ativa há ${activeHours} ${activeHours === 1 ? "hora" : "horas"}`
  }
  const days = Math.floor(activeHours / 24)
  return `Ativa há ${days} ${days === 1 ? "dia" : "dias"}`
}
