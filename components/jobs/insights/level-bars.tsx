import { cn } from "@/lib/utils"
import { formatNumber, formatShare } from "./format"

export type LevelSlice = {
  key: string
  label: string
  count: number
  share_pct: number
}

/**
 * Distribuição por nível.
 *
 * As barras seguem a ordem ORDINAL da senioridade (estágio → júnior → pleno →
 * sênior → staff+), nunca a ordem de contagem. Reordenar uma escala ordinal por
 * magnitude destrói o dado: o que interessa aqui é a FORMA da curva ("o mercado
 * some entre estágio e pleno"), e ordenar por tamanho apagaria exatamente isso.
 * Pelo mesmo motivo, níveis zerados continuam na régua — um buraco no meio da
 * escala é informação, não ausência dela.
 */
export function LevelBars({
  levels,
  total,
}: {
  levels: LevelSlice[]
  total: number
}) {
  const max = Math.max(...levels.map((level) => level.count), 1)
  const leaderKey = levels.reduce(
    (best, level) => (level.count > (best?.count ?? -1) ? level : best),
    levels[0],
  )?.key

  return (
    <ul className="flex items-end gap-2 sm:gap-3">
      {levels.map((level) => {
        const height = level.count === 0 ? 2 : Math.max((level.count / max) * 100, 4)

        return (
          <li key={level.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {level.count > 0 ? formatNumber(level.count) : "—"}
            </span>
            <div className="flex h-28 w-full items-end">
              <div
                aria-hidden="true"
                className={cn(
                  "w-full rounded-t-sm",
                  level.key === leaderKey && level.count > 0
                    ? "bg-chart-1"
                    : "bg-muted-foreground/25",
                )}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-[11px] leading-tight text-muted-foreground">
              {level.label}
            </span>
            <span className="sr-only">{formatShare(level.count, total)}</span>
          </li>
        )
      })}
    </ul>
  )
}
