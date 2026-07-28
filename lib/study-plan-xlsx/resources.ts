/**
 * Monta os links dos materiais de estudo no servidor (determinístico).
 *
 * A IA sugere apenas `titulo` + `tipo` de cada recurso — NUNCA a URL, porque
 * ela não navega na web e inventaria links quebrados. Aqui transformamos isso
 * em links de busca confiáveis (que sempre resolvem): YouTube para vídeo e
 * Google para artigo/curso/exercícios/documentação.
 */
import type { RecursoTipo } from "./types"

function query(titulo: string, competencia?: string): string {
  const parts = [titulo.trim()]
  const comp = competencia?.trim()
  // Só acrescenta a competência quando ela ainda não está no título, para não
  // poluir a busca com termos repetidos.
  if (comp && !titulo.toLowerCase().includes(comp.toLowerCase())) {
    parts.push(comp)
  }
  return parts.join(" ").trim()
}

/**
 * Retorna uma URL de busca para o material sugerido pela IA.
 * - `vídeo` → busca no YouTube.
 * - `documentação` → busca no Google por documentação oficial.
 * - demais (`artigo` | `curso` | `exercícios`) → busca no Google.
 */
export function buildResourceUrl(
  tipo: RecursoTipo,
  titulo: string,
  competencia?: string,
): string {
  const q = query(titulo, competencia)
  if (tipo === "vídeo") {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
  }
  if (tipo === "documentação") {
    return `https://www.google.com/search?q=${encodeURIComponent(`${q} documentação oficial`)}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}
