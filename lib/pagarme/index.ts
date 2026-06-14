// Adaptador deste app sobre o nucleo portavel da Pagar.me.
// Mantem a API publica historica de "@/lib/pagarme" (consumidores e testes nao mudam) e
// e o UNICO arquivo acoplado ao projeto. Para reusar em outro projeto, copie os demais
// modulos de lib/pagarme/* e escreva o seu proprio adaptador (veja README.md).

import type { PaymentStatus } from "@/lib/types/database"
import { createPagarmeClient, type PagarmeClient } from "./client"
import { PagarmeError } from "./errors"
import {
  getCharge as getChargeCore,
  getOrder as getOrderCore,
} from "./orders"
import { createPixCharge, pixDetailsFromCharge } from "./pix"
import { normalizePagarmeStatus } from "./status"
import type {
  CreatePixChargeParams,
  PagarmeCharge,
  PagarmeOrder,
} from "./types"

// ─── Re-exports portaveis ────────────────────────────────────────────────────
export { PagarmeError } from "./errors"
export type { PagarmeErrorKind } from "./errors"
export { firstCharge } from "./orders"
export { createPagarmeClient } from "./client"
export type { PagarmeClient } from "./client"
export { resolveBaseUrl, modeFromSecretKey, PAGARME_API_BASE_URL } from "./config"
export { chargeFailureReason, createPixCharge, pixDetailsFromCharge } from "./pix"
export { normalizePagarmeStatus } from "./status"
export { verifyWebhookBasicAuth, extractChargeFromEvent } from "./webhook"
export type {
  CreatePixChargeParams,
  NormalizedPaymentStatus,
  PagarmeCharge,
  PagarmeChargeStatus,
  PagarmeLastTransaction,
  PagarmeOrder,
  PagarmeWebhookEvent,
  PixDetails,
} from "./types"

const GENERIC_PIX_ERROR = "Nao foi possivel gerar o Pix. Tente novamente em instantes."

// ─── Client singleton (montado a partir do ambiente) ─────────────────────────
// baseUrl e opcional: a lib deriva da secret key e corrige uma PAGARME_BASE_URL
// malformada (ver resolveBaseUrl em ./config), eliminando o 404 do gateway.
let cachedClient: PagarmeClient | null = null

function getClient(): PagarmeClient {
  if (cachedClient) return cachedClient

  const secretKey = process.env.PAGARME_SECRET_KEY
  if (!secretKey) {
    throw new PagarmeError(
      "Pagamento via Pix ainda nao foi configurado. O administrador precisa definir a PAGARME_SECRET_KEY.",
      503,
      undefined,
      "config",
    )
  }

  cachedClient = createPagarmeClient({
    secretKey,
    baseUrl: process.env.PAGARME_BASE_URL,
  })
  return cachedClient
}

// ─── API historica preservada ────────────────────────────────────────────────
export function createPixOrder(params: CreatePixChargeParams): Promise<PagarmeOrder> {
  return createPixCharge(getClient(), params)
}

export function getOrder(orderId: string): Promise<PagarmeOrder> {
  return getOrderCore(getClient(), orderId)
}

export function getCharge(chargeId: string): Promise<PagarmeCharge> {
  return getChargeCore(getClient(), chargeId)
}

// Mantem o shape historico usado pelo app (route.ts / pix-qrcode).
export function chargePixDetails(charge: PagarmeCharge | null | undefined) {
  const pix = pixDetailsFromCharge(charge)
  return {
    data: pix.qrCode,
    imageUrlPng: pix.qrCodeUrl,
    imageUrlSvg: null as string | null,
    hostedInstructionsUrl: null as string | null,
    expiresAt: pix.expiresAt,
  }
}

// Status generico -> PaymentStatus do app ('paid' vira 'confirmed').
export function chargeStatusToPaymentStatus(status: string): PaymentStatus {
  const normalized = normalizePagarmeStatus(status)
  return normalized === "paid" ? "confirmed" : normalized
}

// Traduz um erro da Pagar.me para uma mensagem pt-BR amigavel ao usuario/admin.
export function pagarmePixOrderErrorMessage(error: unknown): string {
  if (!(error instanceof PagarmeError)) return GENERIC_PIX_ERROR

  const lower = error.message.toLowerCase()

  if (error.status === 503) {
    return error.message
  }

  if (
    error.kind === "auth" ||
    error.status === 401 ||
    lower.includes("unauthorized") ||
    lower.includes("api key")
  ) {
    return "Chave secreta da Pagar.me invalida ou ausente. Confira PAGARME_SECRET_KEY em .env.local e reinicie o servidor."
  }

  // 404 "no route matched with those values" = gateway (Kong) sem rota -> base URL incorreta.
  if (error.kind === "gateway_route" || lower.includes("no route matched")) {
    return "Configuracao da API Pagar.me incorreta. Use PAGARME_BASE_URL=https://api.pagar.me/core/v5 (host unico; o ambiente e definido pela chave sk_test_/sk_live_). O antigo sdx-api.pagar.me nao funciona."
  }

  if (
    error.kind === "document" ||
    lower.includes("document") ||
    lower.includes("cpf") ||
    lower.includes("documento")
  ) {
    return "Sua conta Pagar.me exige o CPF do cliente para gerar o Pix. Preencha o campo CPF e tente novamente."
  }

  return error.message || GENERIC_PIX_ERROR
}
