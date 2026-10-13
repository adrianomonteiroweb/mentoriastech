"use client"

import { X } from "lucide-react"
import { getAreaFamilyLabel, getAreaSpecialtyLabel, getInclusionLabel } from "@/lib/job-areas"
import { getStackLabel } from "@/lib/job-stacks"
import { JOB_SCOPE_LABELS, getJobLevelLabel, getJobTypeLabel } from "@/lib/job-labels"
import type { JobListQuery } from "@/lib/job-list-query"
import type { MultiKey } from "./use-job-filters"

// Chips do que esta filtrando AGORA, logo abaixo da busca.
//
// Duas coisas que a pagina antiga nao tinha: (1) o estado do filtro era
// invisivel — dava para estar vendo so vagas de hoje sem perceber; (2) desfazer
// exigia achar "Limpar filtros", que ficava longe, numa barra de acoes
// secundarias. Aqui cada filtro mostra o que e e sai com um toque.

type AppliedChip = { id: string; label: string; onRemove: () => void }

type Props = {
  query: JobListQuery
  onToggle: (key: MultiKey, value: string) => void
  onClear: (key: string) => void
  onClearAll: () => void
}

export function AppliedFilters({ query, onToggle, onClear, onClearAll }: Props) {
  const chips: AppliedChip[] = []

  const multi: [MultiKey, (v: string) => string][] = [
    ["family", getAreaFamilyLabel],
    ["specialty", getAreaSpecialtyLabel],
    ["level", (v) => getJobLevelLabel(v)],
    ["job_type", getJobTypeLabel],
    ["stack", getStackLabel],
    ["inclusion", getInclusionLabel],
    ["country", (v) => v],
  ]

  for (const [key, label] of multi) {
    for (const value of (query[key] as string[]) ?? []) {
      chips.push({
        id: `${key}:${value}`,
        label: label(value),
        onRemove: () => onToggle(key, value),
      })
    }
  }

  if (query.scope !== "all") {
    chips.push({
      id: "scope",
      label: JOB_SCOPE_LABELS[query.scope] ?? query.scope,
      onRemove: () => onClear("scope"),
    })
  }
  if (query.posted === "today") {
    chips.push({ id: "posted", label: "Publicadas hoje", onRemove: () => onClear("posted") })
  }
  if (query.posted && query.posted !== "today") {
    chips.push({
      id: "posted",
      label: `Últimos ${query.posted.replace("d", " dias")}`,
      onRemove: () => onClear("posted"),
    })
  }
  if (query.has_salary === "true") {
    chips.push({ id: "has_salary", label: "Com salário", onRemove: () => onClear("has_salary") })
  }
  if (query.company) {
    chips.push({ id: "company", label: query.company, onRemove: () => onClear("company") })
  }

  if (chips.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Filtros aplicados"
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remover filtro ${chip.label}`}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Limpar tudo
        </button>
      )}
    </div>
  )
}
