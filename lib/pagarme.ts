import type { PaymentStatus } from "@/lib/types/database"

// Pagar.me v5 — Orders API (PIX inline)
// Base URL de teste/sandbox por padrao; producao via PAGARME_BASE_URL.
const DEFAULT_BASE_URL = "https://sdx-api.pagar.me/core/v5"
const USER_AGENT = "pagarme-skill-generated/1.0"

const GENERIC_PIX_ERROR = "Nao foi possivel gerar o Pix. Tente novamente em instantes."

export class PagarmeError extends Error {
  status: number
  pagarmeStatus?: number
  constructor(message: string, status = 502, pagarmeStatus?: number) {
    super(message)
    this.name = "PagarmeError"
    this.status = status
    this.pagarmeStatus = pagarmeStatus
  }
}

function getConfig() {
  const secretKey = process.env.PAGARME_SECRET_KEY
  if (!secretKey) {
    throw new PagarmeError(
      "Pagamento via Pix ainda nao foi configurado. O administrador precisa definir a PAGARME_SECRET_KEY.",
      503,
    )
  }

  const baseUrl = (process.env.PAGARME_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`

  return { baseUrl, authHeader }
}

// -----------------------------------------------------------------------------
// Tipos da Pagar.me (subconjunto usado neste fluxo)
// -----------------------------------------------------------------------------
export type PagarmeChargeStatus =
  | "pending"
  | "paid"
  | "processing"
  | "failed"
  | "canceled"
  | "overpaid"
  | "underpaid"
  | "refunded"
  | "chargedback"

export interface PagarmeLastTransaction {
  qr_code?: string | null
  qr_code_url?: string | null
  expires_at?: string | null
}

export interface PagarmeCharge {
  id: string
  status: PagarmeChargeStatus | string
  last_transaction?: PagarmeLastTransaction | null
}

export interface PagarmeOrder {
  id: string
  status: string
  charges?: PagarmeCharge[] | null
}

interface PagarmeApiError {
  message?: string
  errors?: Record<string, string[]> | unknown
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { baseUrl, authHeader } = getConfig()

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    })
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : "Erro de rede"
    throw new PagarmeError(`Falha ao contatar a Pagar.me: ${message}`, 502)
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    const apiError = (json || {}) as PagarmeApiError
    const detail = pagarmeErrorDetail(apiError)
    throw new PagarmeError(
      detail || `Pagar.me retornou erro ${response.status}.`,
      response.status >= 500 ? 502 : response.status,
      response.status,
    )
  }

  return json as T
}

function pagarmeErrorDetail(apiError: PagarmeApiError): string {
  if (apiError.message) return apiError.message

  const errors = apiError.errors
  if (errors && typeof errors === "object") {
    const firstGroup = Object.values(errors as Record<string, unknown>)[0]
    if (Array.isArray(firstGroup) && typeof firstGroup[0] === "string") {
      return firstGroup[0]
    }
  }
  return ""
}

// -----------------------------------------------------------------------------
// Operacoes
// -----------------------------------------------------------------------------
export async function createPixOrder(params: {
  amountCents: number
  description: string
  customerName: string
  customerEmail: string
  customerDocument?: string | null
  expiresIn: number
  metadata?: Record<string, string>
}): Promise<PagarmeOrder> {
  const customer: Record<string, unknown> = {
    name: params.customerName,
    email: params.customerEmail,
  }

  const document = params.customerDocument?.replace(/\D/g, "")
  if (document) {
    customer.document = document
    customer.document_type = document.length > 11 ? "cnpj" : "cpf"
    customer.type = document.length > 11 ? "company" : "individual"
  }

  return request<PagarmeOrder>("POST", "/orders", {
    items: [
      {
        amount: params.amountCents,
        description: params.description,
        quantity: 1,
      },
    ],
    customer,
    payments: [
      {
        payment_method: "pix",
        pix: { expires_in: params.expiresIn },
      },
    ],
    ...(params.metadata ? { metadata: params.metadata } : {}),
  })
}

export async function getOrder(orderId: string): Promise<PagarmeOrder> {
  return request<PagarmeOrder>("GET", `/orders/${orderId}`)
}

export async function getCharge(chargeId: string): Promise<PagarmeCharge> {
  return request<PagarmeCharge>("GET", `/charges/${chargeId}`)
}

export function firstCharge(order: PagarmeOrder | null | undefined): PagarmeCharge | null {
  return order?.charges?.[0] ?? null
}

export function chargePixDetails(charge: PagarmeCharge | null | undefined) {
  const tx = charge?.last_transaction
  const expiresAt = tx?.expires_at ? new Date(tx.expires_at) : null

  return {
    data: tx?.qr_code ?? null,
    imageUrlPng: tx?.qr_code_url ?? null,
    imageUrlSvg: null as string | null,
    hostedInstructionsUrl: null as string | null,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  }
}

export function chargeStatusToPaymentStatus(status: string): PaymentStatus {
  if (status === "paid" || status === "overpaid") return "confirmed"
  if (status === "refunded" || status === "chargedback") return "refunded"
  if (status === "failed" || status === "canceled" || status === "underpaid") return "failed"
  return "pending"
}

export function pagarmePixOrderErrorMessage(error: unknown): string {
  if (!(error instanceof PagarmeError)) return GENERIC_PIX_ERROR

  const lower = error.message.toLowerCase()

  if (error.status === 503) {
    return error.message
  }

  if (error.status === 401 || lower.includes("unauthorized") || lower.includes("api key")) {
    return "Chave secreta da Pagar.me invalida ou ausente. Confira PAGARME_SECRET_KEY em .env.local e reinicie o servidor."
  }

  // 404 "no route matched with those values" e a resposta do gateway (Kong) da Pagar.me
  // quando a URL nao bate com nenhuma rota — quase sempre PAGARME_BASE_URL sem /core/v5.
  if (lower.includes("no route matched")) {
    return "Configuracao da API Pagar.me incorreta: PAGARME_BASE_URL ausente ou sem /core/v5. Use https://sdx-api.pagar.me/core/v5 (teste) ou https://api.pagar.me/core/v5 (producao)."
  }

  if (lower.includes("document") || lower.includes("cpf") || lower.includes("documento")) {
    return "Sua conta Pagar.me exige o CPF do cliente para gerar o Pix. Preencha o campo CPF e tente novamente."
  }

  // Mensagem da propria Pagar.me, quando util, ja vem em error.message
  return error.message || GENERIC_PIX_ERROR
}
