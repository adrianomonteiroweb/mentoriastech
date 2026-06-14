// Consulta de pedidos/charges. Modulo portavel.

import type { PagarmeClient } from "./client"
import type { PagarmeCharge, PagarmeOrder } from "./types"

export function getOrder(client: PagarmeClient, orderId: string): Promise<PagarmeOrder> {
  return client.request<PagarmeOrder>("GET", `/orders/${orderId}`)
}

export function getCharge(client: PagarmeClient, chargeId: string): Promise<PagarmeCharge> {
  return client.request<PagarmeCharge>("GET", `/charges/${chargeId}`)
}

export function firstCharge(order: PagarmeOrder | null | undefined): PagarmeCharge | null {
  return order?.charges?.[0] ?? null
}
