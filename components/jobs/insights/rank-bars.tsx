import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber, formatShare, isSmallSample } from "./format"

export type RankItem = {
  key: string
  label: string
  count: number
  /** Rótulo secundário à direita do nome (ex.: UF, país). */
  hint?: string | null
  /** Quando presente, a barra vira link de filtro (cross-filter). */
  href?: string
  active?: boolean
}

type RankBarsProps = {
  items: RankItem[]
  /** Denominador do percentual. */
  total: number
  /** Quantos itens mostrar antes do "ver todas". */
  limit?: number
  showAllHref?: string
  expanded?: boolean
}

/**
 * Ranking em barras HORIZONTAIS, ordenado por frequência (Pareto).
 *
 * Horizontal e não vertical: os rótulos são textuais e de comprimento variável;
 * na vertical eles teriam que ser rotacionados, o que custa carga cognitiva e
 * quebra a leitura.
 *
 * É HTML semântico e não SVG: os números ficam no HTML (a página é pública e
 * precisa ser indexável), a leitura por teclado/leitor de tela é nativa e nada
 * é codificado só por cor — cada barra carrega rótulo e valor em texto.
 */
export function RankBars({
  items,
  total,
  limit = 8,
  showAllHref,
  expanded = false,
}: RankBarsProps) {
  const visible = expanded ? items : items.slice(0, limit)
  const max = Math.max(...visible.map((item) => item.count), 1)
  const hidden = items.length - visible.length

  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {visible.map((item, index) => {
          // Von Restorff: UM destaque por gráfico. Destacar tudo é destacar
          // nada — o líder em cor cheia, o resto em tom neutro.
          const isLeader = index === 0
          const width = `${Math.max((item.count / max) * 100, 2)}%`

          const row = (
            <div className="relative flex items-center gap-3 rounded-md px-2 py-1.5">
              <div
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 left-0 rounded-md transition-[width]",
                  isLeader ? "bg-chart-1/20" : "bg-muted",
                  item.active && "ring-1 ring-inset ring-chart-1",
                )}
                style={{ width }}
              />
              <span className="relative min-w-0 flex-1 truncate text-sm">
                {item.label}
                {item.hint ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {item.hint}
                  </span>
                ) : null}
              </span>
              <span className="relative shrink-0 text-sm tabular-nums text-muted-foreground">
                {formatShare(item.count, total)}
              </span>
            </div>
          )

          return (
            <li key={item.key}>
              {item.href ? (
                <Link
                  href={item.href}
                  aria-pressed={item.active}
                  className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent/40"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>

      {isSmallSample(total) ? (
        <p className="px-2 pt-1 text-xs text-muted-foreground">
          Amostra pequena (n={formatNumber(total)}): mostramos a contagem, não o
          percentual.
        </p>
      ) : null}

      {/* Lei de Hick: 8 itens por padrão. O resto fica a um clique — quem quer
          a lista longa a pede; quem quer a leitura rápida não paga por ela. */}
      {!expanded && hidden > 0 && showAllHref ? (
        <Link
          href={showAllHref}
          className="inline-block px-2 pt-1 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver todas ({formatNumber(items.length)})
        </Link>
      ) : null}
    </div>
  )
}
