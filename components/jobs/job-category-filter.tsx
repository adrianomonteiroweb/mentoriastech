"use client"

import { useMemo } from "react"
import {
  Code2,
  Bug,
  Target,
  ClipboardList,
  Database,
  Brain,
  Shield,
  Container,
  Palette,
  Accessibility,
  Users,
  Heart,
  Tag,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  mergeJobCategoryOptions,
} from "@/lib/job-options"

interface JobCategoryFilterProps {
  jobs: { category: string }[]
  selectedCategories: string[]
  onSelectionChange: (categories: string[]) => void
}

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  desenvolvimento: Code2,
  qa: Bug,
  po: Target,
  pm: ClipboardList,
  dados: Database,
  ia: Brain,
  cyber_security: Shield,
  devops: Container,
  design: Palette,
  pcd: Accessibility,
  afirmativa_pessoas_pretas: Users,
  afirmativa_mulheres_tecnologia: Heart,
}

const INCLUSION_CATEGORIES = new Set([
  "pcd",
  "afirmativa_pessoas_pretas",
  "afirmativa_mulheres_tecnologia",
])

export function JobCategoryFilter({
  jobs,
  selectedCategories,
  onSelectionChange,
}: JobCategoryFilterProps) {
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const job of jobs) {
      if (job.category) {
        counts[job.category] = (counts[job.category] || 0) + 1
      }
    }
    return counts
  }, [jobs])

  const allCategories = useMemo(() => {
    return mergeJobCategoryOptions(jobs.map((j) => j.category)).filter(
      (c) => c.value !== "other",
    )
  }, [jobs])

  const techCategories = allCategories.filter(
    (c) => !INCLUSION_CATEGORIES.has(c.value),
  )
  const inclusionCategories = allCategories.filter((c) =>
    INCLUSION_CATEGORIES.has(c.value),
  )

  function toggleCategory(value: string) {
    if (selectedCategories.includes(value)) {
      onSelectionChange(selectedCategories.filter((c) => c !== value))
    } else {
      onSelectionChange([...selectedCategories, value])
    }
  }

  function clearAll() {
    onSelectionChange([])
  }

  return (
    <section aria-labelledby="category-filter-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="category-filter-heading"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Sua area
        </h2>
        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Limpar todos os filtros de categoria"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar ({selectedCategories.length})
          </button>
        )}
      </div>

      <div role="group" aria-label="Categorias de tecnologia">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {techCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.value] || Tag
            const count = categoryCounts[cat.value] || 0
            const isSelected = selectedCategories.includes(cat.value)

            return (
              <button
                key={cat.value}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`${cat.label}, ${count} ${count === 1 ? "vaga" : "vagas"}`}
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  "relative flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-2 border-primary bg-primary/10 font-semibold text-primary"
                    : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-card/80",
                )}
              >
                {isSelected ? (
                  <Check
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{cat.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 text-xs",
                      isSelected
                        ? "text-primary/70"
                        : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {inclusionCategories.length > 0 && (
        <div role="group" aria-label="Vagas de inclusao">
          <span
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            aria-hidden="true"
          >
            Inclusao
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inclusionCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.value] || Tag
              const count = categoryCounts[cat.value] || 0
              const isSelected = selectedCategories.includes(cat.value)

              return (
                <button
                  key={cat.value}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${cat.label}, ${count} ${count === 1 ? "vaga" : "vagas"}`}
                  onClick={() => toggleCategory(cat.value)}
                  className={cn(
                    "relative flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isSelected
                      ? "border-2 border-primary bg-primary/10 font-semibold text-primary"
                      : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-card/80",
                  )}
                >
                  {isSelected ? (
                    <Check
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-auto shrink-0 text-xs",
                        isSelected
                          ? "text-primary/70"
                          : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
