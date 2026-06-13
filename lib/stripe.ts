import Stripe from "stripe"
import type { PaymentStatus } from "@/lib/types/database"

let stripeClient: Stripe | null = null

const GENERIC_PIX_ERROR = "Nao foi possivel gerar o Pix. Tente novamente em instantes."

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY nao configurada")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

export function paymentIntentStatusToPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  if (status === "succeeded") return "confirmed"
  if (status === "canceled" || status === "requires_payment_method") return "failed"
  return "pending"
}

export function paymentIntentPixDetails(paymentIntent: Stripe.PaymentIntent) {
  const pix = paymentIntent.next_action?.pix_display_qr_code
  const expiresAt = pix?.expires_at ? new Date(pix.expires_at * 1000) : null

  return {
    data: pix?.data ?? null,
    imageUrlPng: pix?.image_url_png ?? null,
    imageUrlSvg: pix?.image_url_svg ?? null,
    hostedInstructionsUrl: pix?.hosted_instructions_url ?? null,
    expiresAt,
  }
}

function stripeErrorField(error: unknown, field: "code" | "message" | "param") {
  if (!error || typeof error !== "object" || !(field in error)) return ""

  const value = (error as Record<string, unknown>)[field]
  return typeof value === "string" ? value : ""
}

export function stripePixPaymentIntentErrorMessage(error: unknown) {
  const code = stripeErrorField(error, "code")
  const param = stripeErrorField(error, "param")
  const message = stripeErrorField(error, "message")
  const lowerMessage = message.toLowerCase()

  const pixIsUnavailable =
    code === "payment_method_unactivated" ||
    code === "payment_method_unsupported_type" ||
    (
      code === "payment_intent_invalid_parameter" &&
      param === "payment_method_types" &&
      lowerMessage.includes("pix")
    ) ||
    lowerMessage.includes("payment method type \"pix\" is invalid")

  if (pixIsUnavailable) {
    return "Pix nao esta habilitado nesta conta Stripe. Ative Pix em Payment methods no Dashboard ou use uma chave de teste de uma conta com Pix disponivel."
  }

  if (
    code === "api_key_expired" ||
    code === "secret_key_required" ||
    lowerMessage.includes("invalid api key") ||
    lowerMessage.includes("no api key provided")
  ) {
    return "Chave secreta da Stripe invalida ou ausente. Confira STRIPE_SECRET_KEY em .env.local e reinicie o servidor."
  }

  return GENERIC_PIX_ERROR
}
