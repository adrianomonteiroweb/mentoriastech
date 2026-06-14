// Normalizacao de status de charge. Modulo portavel.

import type { NormalizedPaymentStatus } from "./types"

// Mapeia o status da charge da Pagar.me para um status de pagamento generico.
export function normalizePagarmeStatus(status: string): NormalizedPaymentStatus {
  if (status === "paid" || status === "overpaid") return "paid"
  if (status === "refunded" || status === "chargedback") return "refunded"
  if (status === "failed" || status === "canceled" || status === "underpaid") return "failed"
  return "pending"
}
