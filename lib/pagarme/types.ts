// Tipos da Pagar.me v5 (subconjunto usado no fluxo de Pix avulso via Orders API).
// Modulo portavel: nao importa nada especifico do projeto.

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

export interface PagarmeGatewayResponse {
  code?: string | null
  errors?: Array<{ message?: string | null }> | unknown
}

export interface PagarmeLastTransaction {
  qr_code?: string | null
  qr_code_url?: string | null
  expires_at?: string | null
  status?: string | null
  success?: boolean | null
  acquirer_message?: string | null
  gateway_response?: PagarmeGatewayResponse | null
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

export type PagarmeMode = "test" | "live"

export interface PagarmeClientConfig {
  /** Secret key da Pagar.me (sk_test_... ou sk_live_...). */
  secretKey: string
  /** Opcional. Se omitida/invalida, a lib deriva a URL do prefixo da secret key. */
  baseUrl?: string
  /** Opcional. User-Agent enviado em toda requisicao. */
  userAgent?: string
}

export interface PixDetails {
  qrCode: string | null
  qrCodeUrl: string | null
  expiresAt: Date | null
}

/** Status de pagamento generico (independente de qualquer schema de banco). */
export type NormalizedPaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface CreatePixChargeParams {
  amountCents: number
  description: string
  customerName: string
  customerEmail: string
  customerDocument?: string | null
  /** Telefone do cliente (ex.: WhatsApp). Pagar.me pode exigir ao menos um telefone. */
  customerPhone?: string | null
  /** Validade do QR Code Pix em segundos. */
  expiresIn: number
  metadata?: Record<string, string>
}

/** Estrutura minima de um evento de webhook da Pagar.me v5. */
export interface PagarmeWebhookEvent {
  id?: string
  type?: string
  data?: PagarmeCharge | PagarmeOrder | Record<string, unknown>
}
