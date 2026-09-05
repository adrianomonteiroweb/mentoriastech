import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDelta, formatNumber } from "./format"

export type Kpi = {
  label: string
  value: string
  /** Denominador / contexto do número, em texto. */
  context?: string
  delta: number | null
  /** Rótulo do período de comparação, para o delta não ficar solto. */
  comparisonLabel: string
}

const TONE_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const

/**
 * Faixa de indicadores do topo.
 *
 * Todo tile carrega comparação com o período anterior. Um número absoluto
 * sozinho vira âncora arbitrária: o leitor não tem como saber se 412 vagas é
 * muito ou pouco, e ancora na primeira grandeza que vê. O delta dá a régua.
 */
export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const delta = formatDelta(kpi.delta)
        const Icon = delta ? TONE_ICON[delta.tone] : null

        return (
          <Card key={kpi.label} className="min-w-0">
            <CardContent className="space-y-1 p-4">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              {kpi.context ? (
                <p className="text-xs text-muted-foreground">{kpi.context}</p>
              ) : null}
              {delta && Icon ? (
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs tabular-nums",
                    delta.tone === "up" && "text-emerald-600 dark:text-emerald-400",
                    delta.tone === "down" && "text-amber-600 dark:text-amber-400",
                    delta.tone === "flat" && "text-muted-foreground",
                  )}
                >
                  {/* O ícone é redundante com o sinal do número de propósito:
                      cor sozinha não pode carregar informação. */}
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {delta.text}
                  <span className="text-muted-foreground">
                    vs. {kpi.comparisonLabel}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  sem período anterior para comparar
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export { formatNumber }
