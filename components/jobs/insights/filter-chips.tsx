import Link from "next/link"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChipOption = {
  value: string
  label: string
  href: string
  active: boolean
}

/**
 * Seletor de período e filtros ativos.
 *
 * São links, não botões com estado em JS: o recorte vive na URL, então a página
 * é compartilhável, indexável e reproduzível — recarregar traz exatamente o
 * mesmo painel. O padrão de estado-na-URL é o mesmo já usado em
 * components/dashboard/admin/jobs-table.tsx.
 *
 * As opções ficam TODAS visíveis, e não escondidas num dropdown fechado: o
 * recorte padrão (30 dias) precisa ser óbvio, senão o leitor toma o número como
 * "o mercado" em vez de "o mercado nos últimos 30 dias".
 */
export function PeriodChips({ options }: { options: ChipOption[] }) {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            option.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}

export type ActiveFilter = {
  label: string
  value: string
  clearHref: string
}

export function ActiveFilters({ filters }: { filters: ActiveFilter[] }) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtrando por:</span>
      {filters.map((filter) => (
        <Link
          key={`${filter.label}-${filter.value}`}
          href={filter.clearHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-chart-1 bg-chart-1/10 px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-chart-1/20"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <X className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Remover filtro</span>
        </Link>
      ))}
    </div>
  )
}
