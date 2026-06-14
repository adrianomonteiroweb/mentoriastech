// Pix avulso (inline) via Orders API v5. Modulo portavel.

import type { PagarmeClient } from "./client"
import type {
  CreatePixChargeParams,
  PagarmeCharge,
  PagarmeOrder,
  PixDetails,
} from "./types"

// Converte um telefone BR ("(85) 99999-9999", "5585999999999", etc.) para o formato
// de telefone da Pagar.me v5. Retorna null quando nao ha digitos suficientes.
function toPagarmePhone(
  raw: string | null | undefined,
): { country_code: string; area_code: string; number: string } | null {
  let digits = (raw ?? "").replace(/\D/g, "")
  if (!digits) return null

  // Remove o codigo do pais (55) quando presente, deixando DDD + numero.
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2)
  }

  // Espera DDD (2) + numero (8 fixo ou 9 celular).
  if (digits.length < 10 || digits.length > 11) return null

  return {
    country_code: "55",
    area_code: digits.slice(0, 2),
    number: digits.slice(2),
  }
}

// Cria um pedido Pix de cobranca unica e retorna o pedido (com a charge e o QR Code).
export function createPixCharge(
  client: PagarmeClient,
  params: CreatePixChargeParams,
): Promise<PagarmeOrder> {
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

  const phone = toPagarmePhone(params.customerPhone)
  if (phone) {
    customer.phones = { mobile_phone: phone }
  }

  return client.request<PagarmeOrder>("POST", "/orders", {
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

// Extrai os dados do QR Code Pix da ultima transacao de uma charge.
export function pixDetailsFromCharge(charge: PagarmeCharge | null | undefined): PixDetails {
  const tx = charge?.last_transaction
  const expiresAt = tx?.expires_at ? new Date(tx.expires_at) : null

  return {
    qrCode: tx?.qr_code ?? null,
    qrCodeUrl: tx?.qr_code_url ?? null,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  }
}

// Monta uma string legivel com o motivo da falha de uma charge (gateway/adquirente).
// Usado para diagnostico quando a Pagar.me recusa gerar o Pix (charge "failed").
export function chargeFailureReason(charge: PagarmeCharge | null | undefined): string {
  const tx = charge?.last_transaction
  const parts: string[] = []

  if (tx?.acquirer_message) parts.push(tx.acquirer_message)

  const gateway = tx?.gateway_response
  if (gateway?.code) parts.push(`gateway ${gateway.code}`)
  if (Array.isArray(gateway?.errors)) {
    for (const err of gateway.errors) {
      if (err && typeof err === "object" && "message" in err && err.message) {
        parts.push(String(err.message))
      }
    }
  }

  if (tx?.status && tx.status !== charge?.status) parts.push(`transacao ${tx.status}`)

  return parts.length > 0 ? parts.join("; ") : "sem detalhes"
}
