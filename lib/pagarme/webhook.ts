// Utilitarios de webhook da Pagar.me v5. Modulo portavel (usa node:crypto).

import { timingSafeEqual } from "node:crypto"
import { firstCharge } from "./orders"
import type { PagarmeCharge, PagarmeOrder, PagarmeWebhookEvent } from "./types"

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Valida o cabecalho Authorization (HTTP Basic) configurado no endpoint do webhook.
// Retorna null quando as credenciais nao foram configuradas (user/pass ausentes),
// permitindo ao chamador distinguir "nao configurado" de "nao autorizado".
export function verifyWebhookBasicAuth(
  authHeader: string | null | undefined,
  credentials: { user?: string | null; pass?: string | null },
): boolean | null {
  const { user, pass } = credentials
  if (!user || !pass) return null

  const header = authHeader || ""
  if (!header.startsWith("Basic ")) return false

  const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
  return safeEqual(header, expected)
}

// Extrai a charge de um evento: eventos charge.* trazem a charge direto;
// eventos order.* trazem o pedido com charges[].
export function extractChargeFromEvent(event: PagarmeWebhookEvent): PagarmeCharge | null {
  const data = event?.data
  if (!data) return null

  if ("charges" in data && Array.isArray((data as PagarmeOrder).charges)) {
    return firstCharge(data as PagarmeOrder)
  }
  if ("id" in data) {
    return data as PagarmeCharge
  }
  return null
}
