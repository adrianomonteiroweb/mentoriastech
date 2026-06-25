// Blocos do dashboard admin que podem ser ocultados pelo usuário.
// Os ids são persistidos em UserPreferences.dashboardBlocks (localStorage).

export interface DashboardBlock {
  id: string
  label: string
}

export const DASHBOARD_BLOCKS: DashboardBlock[] = [
  { id: "mentorias", label: "Mentorias" },
  { id: "receita", label: "Receita & Mentorias Pagas" },
  { id: "publico", label: "Página Pública & Aquisição" },
  { id: "ferramentas", label: "Ferramentas Minhas Mentorias" },
  { id: "outras-metricas", label: "Outras métricas" },
  { id: "ranking", label: "Ranking de Temas" },
]

// Um bloco é visível a menos que esteja explicitamente marcado como `false`.
export function isBlockVisible(
  blocks: Record<string, boolean>,
  id: string,
): boolean {
  return blocks[id] !== false
}
