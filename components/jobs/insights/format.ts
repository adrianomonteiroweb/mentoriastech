// Helpers de formatação do painel de indicadores.
//
// Cada função aqui existe para conter um viés de leitura específico. Não são
// utilitários genéricos — o comportamento "estranho" de cada uma é deliberado.

/**
 * Abaixo deste n, percentual não é publicado: com 7 vagas, "43%" soa como
 * medida e é ruído. É a lei dos pequenos números — o leitor generaliza de uma
 * amostra pequena com a mesma confiança de uma grande.
 */
export const SMALL_SAMPLE_THRESHOLD = 10

const nf = new Intl.NumberFormat("pt-BR")

export function formatNumber(value: number): string {
  return nf.format(value)
}

export function isSmallSample(total: number): boolean {
  return total < SMALL_SAMPLE_THRESHOLD
}

/**
 * Contagem + percentual, nessa ordem, sempre com o denominador visível.
 * Percentual sozinho esconde o denominador ("62%" de 8 vagas lê igual a "62%"
 * de 800); contagem sozinha não deixa comparar entre recortes.
 */
export function formatShare(count: number, total: number): string {
  if (!total) return "0"
  if (isSmallSample(total)) return formatNumber(count)
  const pct = Math.round((count / total) * 1000) / 10
  return `${formatNumber(count)} · ${pct.toLocaleString("pt-BR")}%`
}

/** Δ% vs. período anterior. null quando não há base de comparação. */
export function formatDelta(delta: number | null): {
  text: string
  tone: "up" | "down" | "flat"
} | null {
  if (delta === null) return null
  if (delta === 0) return { text: "estável", tone: "flat" }
  const sign = delta > 0 ? "+" : ""
  return {
    text: `${sign}${delta.toLocaleString("pt-BR")}%`,
    tone: delta > 0 ? "up" : "down",
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "12m": "12 meses",
  all: "Tudo",
}
