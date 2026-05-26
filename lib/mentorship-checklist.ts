export interface MentorshipChecklistConfigItem {
  id: string
  label: string
}

export interface MentorshipChecklistSnapshotItem extends MentorshipChecklistConfigItem {
  checked: boolean
}

export const MENTORSHIP_CHECKLIST_SETTING_KEY = "mentorship_checklist"

export const DEFAULT_MENTORSHIP_CHECKLIST: MentorshipChecklistConfigItem[] = [
  { id: "explicacao-sobre-a-mentoria", label: "Explicacao sobre a mentoria" },
  { id: "apresentacao-do-mentorado", label: "Apresentacao do mentorado" },
  { id: "duvidas-sobre-a-trajetoria-e-dicas", label: "Duvidas sobre a trajetoria e dicas" },
  { id: "posicionamento-linkedin", label: "Posicionamento: LinkedIn" },
  { id: "posicionamento-curriculo", label: "Posicionamento: curriculo" },
  { id: "posicionamento-projetos-de-portfolio", label: "Posicionamento: projetos de portfolio" },
]

function slugifyChecklistLabel(label: string, index: number) {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || `item-${index + 1}`
}

export function normalizeMentorshipChecklistConfig(
  value: unknown,
  fallbackToDefault = true,
): MentorshipChecklistConfigItem[] {
  if (!Array.isArray(value)) return fallbackToDefault ? DEFAULT_MENTORSHIP_CHECKLIST : []

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const raw = item as { id?: unknown; label?: unknown }
      const label = typeof raw.label === "string" ? raw.label.trim() : ""
      if (!label) return null

      const id =
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim()
          : slugifyChecklistLabel(label, index)

      return { id, label }
    })
    .filter((item): item is MentorshipChecklistConfigItem => !!item)

  return items.length ? items : fallbackToDefault ? DEFAULT_MENTORSHIP_CHECKLIST : []
}

export function normalizeMentorshipChecklistSnapshot(
  value: unknown,
): MentorshipChecklistSnapshotItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const raw = item as { id?: unknown; label?: unknown; checked?: unknown }
      const label = typeof raw.label === "string" ? raw.label.trim() : ""
      if (!label) return null

      const id =
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim()
          : slugifyChecklistLabel(label, index)

      return { id, label, checked: raw.checked === true }
    })
    .filter((item): item is MentorshipChecklistSnapshotItem => !!item)
}

export function createMentorshipChecklistSnapshot(
  items: MentorshipChecklistConfigItem[],
): MentorshipChecklistSnapshotItem[] {
  return items.map((item) => ({ ...item, checked: false }))
}
