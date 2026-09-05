import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ChartCardProps = {
  title: string
  /**
   * Resumo em prosa do que o bloco mostra. Um texto que serve a quatro
   * públicos: leitor de tela, agente/LLM lendo a página, preview de rede social
   * e o leitor apressado que não vai interpretar o gráfico.
   */
  summary?: string
  /** Ressalva de honestidade sobre como o número foi obtido. */
  caveat?: string
  /** Linhas da tabela equivalente ao gráfico: [rótulo, valor]. */
  tableHeaders?: [string, string]
  tableRows?: [string, string][]
  emptyMessage?: string
  isEmpty?: boolean
  children: ReactNode
}

/**
 * Moldura comum dos blocos do painel. Concentra num lugar só as regras que, de
 * outra forma, alguém esqueceria em metade dos gráficos:
 *
 *  - todo gráfico vem com um resumo em prosa antes do visual;
 *  - todo gráfico tem uma TABELA equivalente atrás de <details>, para quem usa
 *    leitor de tela receber o dado e não um SVG mudo;
 *  - estado vazio explica o PORQUÊ, em vez de mostrar um gráfico sem barras.
 */
export function ChartCard({
  title,
  summary,
  caveat,
  tableHeaders,
  tableRows,
  emptyMessage,
  isEmpty,
  children,
}: ChartCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {summary ? (
          <p className="text-sm text-muted-foreground">{summary}</p>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {isEmpty ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage || "Sem dados suficientes neste período."}
          </p>
        ) : (
          <>
            {children}

            {caveat ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {caveat}
              </p>
            ) : null}

            {tableRows && tableRows.length > 0 && tableHeaders ? (
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Ver dados em tabela
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{title}</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          {tableHeaders[0]}
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          {tableHeaders[1]}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map(([label, value]) => (
                        <tr key={label} className="border-b border-border/50 last:border-0">
                          <th scope="row" className="py-2 pr-4 font-normal">
                            {label}
                          </th>
                          <td className="py-2 tabular-nums">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
