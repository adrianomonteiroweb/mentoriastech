export interface SelectionProcessChecklistItem {
  id: string
  label: string
  checked: boolean
}

export const SELECTION_PROCESS_CHECKLIST_POINTS_PER_ITEM = 2

export const SELECTION_PROCESS_CHECKLIST_LABELS: { id: string; label: string }[] = [
  { id: "aderencia-vaga", label: "Aderência à vaga de acordo com o interesse do mentorado" },
  { id: "nivel-tecnico", label: "Nível técnico aderente e capaz de entregar no dia a dia as tasks" },
  { id: "personalidade-cultura", label: "Personalidade com match com a cultura da empresa" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "colaboracao", label: "Colaboração" },
  { id: "perfil-inovacao", label: "Perfil para inovação" },
  { id: "perfil-aprendizado-continuo", label: "Perfil aprendizado contínuo" },
  { id: "projetos-reais", label: "Participou de projetos reais" },
]

export const SELECTION_PROCESS_CHECKLIST_MAX_SCORE =
  SELECTION_PROCESS_CHECKLIST_LABELS.length * SELECTION_PROCESS_CHECKLIST_POINTS_PER_ITEM

export function normalizeSelectionProcessChecklist(value: unknown): SelectionProcessChecklistItem[] {
  const checkedMap = new Map<string, boolean>()
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue
      const raw = item as { id?: unknown; checked?: unknown }
      if (typeof raw.id === "string") checkedMap.set(raw.id, raw.checked === true)
    }
  }

  return SELECTION_PROCESS_CHECKLIST_LABELS.map((item) => ({
    ...item,
    checked: checkedMap.get(item.id) === true,
  }))
}

export function calculateSelectionProcessScore(checklist: SelectionProcessChecklistItem[]): number {
  return checklist.filter((item) => item.checked).length * SELECTION_PROCESS_CHECKLIST_POINTS_PER_ITEM
}
