import type { jobAlertSubscriptions } from "./schema"

type JobAlertRow = typeof jobAlertSubscriptions.$inferSelect

/** Níveis que o bot (detectLevel) sabe extrair de um título de vaga. */
export const LEVEL_VALUES = ["internship", "junior", "mid", "senior"] as const
export type LevelValue = (typeof LEVEL_VALUES)[number]

/** Rótulos pt-BR para a multi-seleção de níveis na UI. */
export const LEVEL_OPTIONS: { value: LevelValue; label: string }[] = [
  { value: "internship", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "mid", label: "Pleno" },
  { value: "senior", label: "Sênior" },
]

/** Chips sugeridos p/ Posições — casados como substring no título da vaga. */
export const SUGGESTED_POSITIONS = [
  "desenvolvedor",
  "programador",
  "engenheiro de software",
  "analista de sistemas",
  "analista de dados",
  "analista de projetos",
  "ux designer",
  "ui designer",
  "product manager",
  "gerente de projetos",
  "scrum master",
  "tech lead",
  "qa",
  "devops",
  "suporte",
]

/** Chips sugeridos p/ Stack — casados como substring no título da vaga. */
export const SUGGESTED_STACK = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "python",
  "java",
  "c#",
  ".net",
  "angular",
  "vue",
  "php",
  "go",
  "flutter",
  "sql",
]

/** Forma serializada (snake_case) entregue ao painel do mentorado. */
export interface JobAlertPayload {
  enabled: boolean
  name: string
  whatsapp: string
  positions: string[]
  stack: string[]
  levels: string[]
  ignore_words: string[]
  is_international: boolean
  daily_limit: number
}

export function mapJobAlert(row: JobAlertRow): JobAlertPayload {
  return {
    enabled: row.enabled,
    name: row.name ?? "",
    whatsapp: row.whatsapp ?? "",
    positions: row.positions ?? [],
    stack: row.stack ?? [],
    levels: row.levels ?? [],
    ignore_words: row.ignoreWords ?? [],
    is_international: row.isInternational,
    daily_limit: row.dailyLimit,
  }
}

/** Item da inscrição enriquecido com dados do mentorado, p/ o painel admin. */
export interface AdminJobAlert extends JobAlertPayload {
  id: string
  profile_id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

/** Forma da linha do JOIN job_alert_subscriptions + profiles usada abaixo. */
export interface AdminJobAlertRow extends JobAlertRow {
  email: string
  fullName: string | null
}

export function mapJobAlertAdmin(row: AdminJobAlertRow): AdminJobAlert {
  return {
    ...mapJobAlert(row),
    id: row.id,
    profile_id: row.profileId,
    email: row.email,
    full_name: row.fullName,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

/** Normaliza palavras-chave (trim + minúsculas + dedupe), fiel ao splitList do bot. */
export function normalizeKeywords(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const value = raw.trim().toLowerCase()
    if (value && !seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

export function dedupeList<T>(list: T[]): T[] {
  return Array.from(new Set(list))
}

/**
 * Estado inicial quando o mentorado ainda não tem inscrição — pré-preenche
 * nome e WhatsApp com o que já existir no profile.
 */
export function defaultJobAlert(prefill: {
  name?: string | null
  whatsapp?: string | null
}): JobAlertPayload {
  return {
    enabled: true,
    name: prefill.name ?? "",
    whatsapp: prefill.whatsapp ?? "",
    positions: [],
    stack: [],
    levels: [],
    ignore_words: [],
    is_international: true,
    daily_limit: 10,
  }
}
