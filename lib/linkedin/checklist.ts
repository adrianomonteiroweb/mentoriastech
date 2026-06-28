export type ChecklistSeverity = "critical" | "important" | "bonus"
export type ChecklistStatus = "ok" | "partial" | "missing"
export type ChecklistSource = "pdf" | "self"

export interface LinkedInChecklistItem {
  id: string
  section: string
  label: string
  severity: ChecklistSeverity
  status: ChecklistStatus
  recommendation: string
}

interface ChecklistAxis {
  id: string
  section: string
  label: string
  severity: ChecklistSeverity
  source: ChecklistSource
}

/**
 * Lista canônica e ordenada dos eixos avaliados no perfil LinkedIn.
 * A severidade é fixa no código (garante o mapa de cores do resultado);
 * a IA decide apenas status + texto da recomendação de cada eixo.
 */
export const LINKEDIN_CHECKLIST_AXES: ChecklistAxis[] = [
  {
    id: "headline",
    section: "Headline",
    label: "Headline com cargo e senioridade claros",
    severity: "critical",
    source: "pdf",
  },
  {
    id: "about",
    section: "Sobre",
    label: "Seção 'Sobre' contando sua trajetória",
    severity: "critical",
    source: "pdf",
  },
  {
    id: "experience_impact",
    section: "Experiências",
    label: "Experiências com principais atividades, um projeto relevante e resultados",
    severity: "critical",
    source: "pdf",
  },
  {
    id: "headline_niche",
    section: "Headline",
    label: "Segunda vertente / nicho na headline (profissional em T)",
    severity: "important",
    source: "pdf",
  },
  {
    id: "education_impact",
    section: "Formações",
    label: "Formações com projeto ou atividade relevante e resultados",
    severity: "important",
    source: "pdf",
  },
  {
    id: "language",
    section: "Idioma",
    label: "Idioma do perfil alinhado ao mercado-alvo",
    severity: "important",
    source: "pdf",
  },
  {
    id: "connections",
    section: "Conexões",
    label: "Conexões estratégicas (ex-colegas, colegas atuais, empresas-alvo, RH/marketing/comercial)",
    severity: "important",
    source: "self",
  },
  {
    id: "recommendations",
    section: "Recomendações",
    label: "Recomendações de colegas e gestores",
    severity: "important",
    source: "self",
  },
  {
    id: "publications",
    section: "Publicações",
    label: "Publicações documentando sua evolução (cursos, eventos, projetos)",
    severity: "bonus",
    source: "self",
  },
]

/** Eixos avaliáveis apenas a partir do PDF — usados no score do upload. */
export const PDF_AXIS_IDS: string[] = LINKEDIN_CHECKLIST_AXES.filter(
  (axis) => axis.source === "pdf",
).map((axis) => axis.id)

/** Todos os ids canônicos (análise completa). */
export const ALL_AXIS_IDS: string[] = LINKEDIN_CHECKLIST_AXES.map((axis) => axis.id)

const SEVERITY_WEIGHT: Record<ChecklistSeverity, number> = {
  critical: 3,
  important: 2,
  bonus: 1,
}

const STATUS_COVERAGE: Record<ChecklistStatus, number> = {
  ok: 1,
  partial: 0.5,
  missing: 0,
}

const SEVERITY_ORDER: Record<ChecklistSeverity, number> = {
  critical: 0,
  important: 1,
  bonus: 2,
}

interface RawChecklistItem {
  id?: unknown
  status?: unknown
  recommendation?: unknown
}

function normalizeStatus(value: unknown): ChecklistStatus {
  return value === "ok" || value === "partial" ? value : "missing"
}

/**
 * Mescla os itens devolvidos pela IA (por `id`) sobre os eixos canônicos
 * permitidos, preservando severity/ordem do código. Eixos ausentes na resposta
 * entram como `missing`. Garante o conjunto fixo de itens, sem inventar eixos.
 */
export function mergeChecklist(
  aiItems: unknown,
  allowedIds: string[],
): LinkedInChecklistItem[] {
  const byId = new Map<string, RawChecklistItem>()
  if (Array.isArray(aiItems)) {
    for (const raw of aiItems as RawChecklistItem[]) {
      if (raw && typeof raw.id === "string") {
        byId.set(raw.id, raw)
      }
    }
  }

  const allowed = new Set(allowedIds)

  return LINKEDIN_CHECKLIST_AXES.filter((axis) => allowed.has(axis.id)).map((axis) => {
    const raw = byId.get(axis.id)
    const recommendation =
      raw && typeof raw.recommendation === "string" ? raw.recommendation.trim() : ""
    return {
      id: axis.id,
      section: axis.section,
      label: axis.label,
      severity: axis.severity,
      status: normalizeStatus(raw?.status),
      recommendation,
    }
  })
}

/**
 * Calcula o % do perfil (0-100) a partir da cobertura do checklist.
 * Determinístico: o número só sobe quando o status de um eixo melhora.
 */
export function scoreFromChecklist(items: LinkedInChecklistItem[]): number {
  let weighted = 0
  let total = 0
  for (const item of items) {
    const weight = SEVERITY_WEIGHT[item.severity] ?? 1
    total += weight
    weighted += weight * (STATUS_COVERAGE[item.status] ?? 0)
  }
  if (total === 0) return 0
  return Math.round((100 * weighted) / total)
}

/** Ordena os itens por severidade (crítico → importante → bônus). */
export function sortBySeverity(items: LinkedInChecklistItem[]): LinkedInChecklistItem[] {
  return [...items].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
}
