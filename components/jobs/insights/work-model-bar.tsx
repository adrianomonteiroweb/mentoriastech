import { cn } from "@/lib/utils"
import { formatNumber } from "./format"

export type WorkModelSlice = {
  key: string
  label: string
  count: number
  share_pct: number
}

// Cor fixa por modalidade: a mesma categoria tem a mesma cor em toda a página.
const SLICE_CLASS: Record<string, string> = {
  remote: "bg-chart-1",
  hybrid: "bg-chart-3",
  onsite: "bg-chart-2",
}

/**
 * Divisão do modelo de trabalho como UMA barra 100% empilhada, não pizza.
 *
 * Com três categorias, a barra empilhada compara proporções melhor que setores
 * circulares (comparar ângulos é mais difícil que comparar comprimentos) e
 * ocupa uma fração da altura. Os rótulos ficam logo abaixo, ligados por cor E
 * por texto — sem legenda separada, que obrigaria o olho a ir e voltar.
 */
export function WorkModelBar({
  slices,
  total,
}: {
  slices: WorkModelSlice[]
  total: number
}) {
  if (total === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {slices.map((slice) => (
          <div
            key={slice.key}
            className={cn(
              "flex items-center justify-center",
              SLICE_CLASS[slice.key] ?? "bg-muted",
            )}
            style={{ width: `${Math.max(slice.share_pct, 0)}%` }}
            title={`${slice.label}: ${formatNumber(slice.count)}`}
          >
            {slice.share_pct >= 12 ? (
              <span className="px-2 text-xs font-medium text-white tabular-nums">
                {slice.share_pct.toLocaleString("pt-BR")}%
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-sm",
                SLICE_CLASS[slice.key] ?? "bg-muted",
              )}
            />
            <span>{slice.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(slice.count)} ·{" "}
              {slice.share_pct.toLocaleString("pt-BR")}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
