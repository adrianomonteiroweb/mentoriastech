import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import {
  paymentIntentPixDetails,
  paymentIntentStatusToPaymentStatus,
  stripePixPaymentIntentErrorMessage,
} from "@/lib/stripe"

describe("Stripe Pix helpers", () => {
  it("maps payment intent statuses to local payment statuses", () => {
    expect(paymentIntentStatusToPaymentStatus("succeeded")).toBe("confirmed")
    expect(paymentIntentStatusToPaymentStatus("canceled")).toBe("failed")
    expect(paymentIntentStatusToPaymentStatus("requires_action")).toBe("pending")
    expect(paymentIntentStatusToPaymentStatus("processing")).toBe("pending")
  })

  it("extracts Pix QR code details from next_action", () => {
    const paymentIntent = {
      next_action: {
        pix_display_qr_code: {
          data: "000201PIX",
          image_url_png: "https://q.stripe.com/qr.png",
          image_url_svg: "https://q.stripe.com/qr.svg",
          hosted_instructions_url: "https://payments.stripe.com/pix",
          expires_at: 1780640000,
        },
      },
    } as Stripe.PaymentIntent

    expect(paymentIntentPixDetails(paymentIntent)).toEqual({
      data: "000201PIX",
      imageUrlPng: "https://q.stripe.com/qr.png",
      imageUrlSvg: "https://q.stripe.com/qr.svg",
      hostedInstructionsUrl: "https://payments.stripe.com/pix",
      expiresAt: new Date(1780640000 * 1000),
    })
  })

  it("returns a clear message when Pix is not active in Stripe", () => {
    const message = stripePixPaymentIntentErrorMessage({
      code: "payment_intent_invalid_parameter",
      param: "payment_method_types",
      message:
        'The payment method type "pix" is invalid. Please ensure the provided type is activated in your dashboard.',
    })

    expect(message).toContain("Pix nao esta habilitado")
    expect(message).toContain("Dashboard")
  })

  it("returns a clear message for invalid Stripe keys", () => {
    const message = stripePixPaymentIntentErrorMessage({
      code: "api_key_expired",
      message: "Expired API Key provided",
    })

    expect(message).toContain("Chave secreta da Stripe")
    expect(message).toContain("STRIPE_SECRET_KEY")
  })
})
