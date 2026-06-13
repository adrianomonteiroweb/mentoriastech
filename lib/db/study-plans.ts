import type { studyPlans } from "./schema"

type StudyPlanRow = typeof studyPlans.$inferSelect

export type StudyPlanProgressItem = { id: string; label: string; checked: boolean }

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export function mapStudyPlan(row: StudyPlanRow) {
  return {
    id: row.id,
    profile_id: row.profileId,
    title: row.title,
    role_type: row.roleType,
    stack: row.stack,
    seniority: row.seniority,
    languages: row.languages ?? [],
    frameworks: row.frameworks ?? [],
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    experience: row.experience,
    minutes_per_day: row.minutesPerDay,
    linked_opportunity_ids: row.linkedOpportunityIds ?? [],
    plan_markdown: row.planMarkdown,
    progress: (row.progress ?? []) as StudyPlanProgressItem[],
    status: row.status,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

/**
 * Deriva um checklist de progresso a partir das seções (## / ### Semana) do
 * markdown gerado pela IA, para o mentorado acompanhar o que já concluiu.
 */
export function buildProgressFromMarkdown(markdown: string): StudyPlanProgressItem[] {
  if (!markdown) return []
  const items: StudyPlanProgressItem[] = []
  const lines = markdown.split("\n")
  let index = 0
  for (const raw of lines) {
    const line = raw.trim()
    // Subseções de semana (### ...Semana...) viram itens acionáveis
    const isWeek = /^#{2,4}\s+.*semana/i.test(line)
    const isSection = /^##\s+\S/.test(line)
    if (isWeek || isSection) {
      const label = line.replace(/^#{2,4}\s+/, "").replace(/[*_`]/g, "").trim()
      if (label) {
        items.push({ id: `p-${index}`, label, checked: false })
        index += 1
      }
    }
  }
  return items
}
