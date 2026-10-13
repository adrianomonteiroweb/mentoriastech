"use client"

import { RotateCcw, SearchX } from "lucide-react"
import { getAreaFamilyLabel, getAreaSpecialtyLabel, getInclusionLabel } from "@/lib/job-areas"
import { getStackLabel } from "@/lib/job-stacks"
import { getJobLevelLabel, getJobTypeLabel } from "@/lib/job-labels"
import type { JobListQuery } from "@/lib/job-list-query"

// Zero resultado e um estado DESENHADO, nao uma frase solta.
//
// A pagina antiga dizia "Nenhuma vaga corresponde aos filtros selecionados" e
// oferecia so "limpar tudo" — jogava fora o trabalho inteiro de filtragem por
// causa de UM filtro restritivo demais. Aqui apontamos o filtro mais provavel
// de ser o culpado e oferecemos afrouxar SO ELE.

type Props = {
  query: JobListQuery
  hasFilters: boolean
  onRelax: (key: string) => void
  onClearAll: () => void
}

/**
 * Qual filtro provavelmente zerou a busca.
 *
 * Ordem = do mais restritivo para o menos. Especialidade corta mais que
 * familia; stack e pais cortam mais que nivel. A busca textual vem primeiro
 * porque um termo com erro de digitacao zera tudo sozinho.
 */
function mostRestrictive(query: JobListQuery): { key: string; label: string } | null {
  if (query.q) return { key: "q", label: `a busca por "${query.q}"` }
  if (query.specialty.length > 0)
    return { key: "specialty", label: `a especialidade ${getAreaSpecialtyLabel(query.specialty[0])}` }
  if (query.stack.length > 0)
    return { key: "stack", label: `a tecnologia ${getStackLabel(query.stack[0])}` }
  if (query.country.length > 0)
    return { key: "country", label: `o país ${query.country[0]}` }
  if (query.inclusion.length > 0)
    return { key: "inclusion", label: `o filtro ${getInclusionLabel(query.inclusion[0])}` }
  if (query.has_salary === "true") return { key: "has_salary", label: "o filtro de salário" }
  if (query.posted) return { key: "posted", label: "o filtro de data" }
  if (query.level.length > 0)
    return { key: "level", label: `o nível ${getJobLevelLabel(query.level[0])}` }
  if (query.job_type.length > 0)
    return { key: "job_type", label: `a modalidade ${getJobTypeLabel(query.job_type[0])}` }
  if (query.family.length > 0)
    return { key: "family", label: `a área ${getAreaFamilyLabel(query.family[0])}` }
  if (query.scope !== "all") return { key: "scope", label: "o filtro de localização" }
  return null
}

export function EmptyState({ query, hasFilters, onRelax, onClearAll }: Props) {
  if (!hasFilters) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="font-semibold text-foreground">Nenhuma vaga disponível agora</p>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          A curadoria roda ao longo do dia. Volte mais tarde para ver as vagas novas.
        </p>
      </div>
    )
  }

  const culprit = mostRestrictive(query)

  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="max-w-sm">
        <p className="font-semibold text-foreground">Nenhuma vaga com esses filtros</p>
        {culprit && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Tente remover {culprit.label} — costuma ser o filtro que mais restringe.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {culprit && (
          <button
            type="button"
            onClick={() => onRelax(culprit.key)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Remover esse filtro
          </button>
        )}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Limpar tudo
        </button>
      </div>
    </div>
  )
}
