import { describe, expect, it } from "vitest"
import {
  PagarmeError,
  chargePixDetails,
  chargeStatusToPaymentStatus,
  firstCharge,
  pagarmePixOrderErrorMessage,
  type PagarmeCharge,
  type PagarmeOrder,
} from "@/lib/pagarme"

describe("Pagar.me Pix helpers", () => {
  it("maps charge statuses to local payment statuses", () => {
    expect(chargeStatusToPaymentStatus("paid")).toBe("confirmed")
    expect(chargeStatusToPaymentStatus("overpaid")).toBe("confirmed")
    expect(chargeStatusToPaymentStatus("refunded")).toBe("refunded")
    expect(chargeStatusToPaymentStatus("chargedback")).toBe("refunded")
    expect(chargeStatusToPaymentStatus("failed")).toBe("failed")
    expect(chargeStatusToPaymentStatus("canceled")).toBe("failed")
    expect(chargeStatusToPaymentStatus("pending")).toBe("pending")
    expect(chargeStatusToPaymentStatus("processing")).toBe("pending")
  })

  it("extracts the first charge from an order", () => {
    const order = { id: "or_1", status: "pending", charges: [{ id: "ch_1", status: "pending" }] } as PagarmeOrder
    expect(firstCharge(order)?.id).toBe("ch_1")
    expect(firstCharge({ id: "or_2", status: "pending", charges: [] } as PagarmeOrder)).toBeNull()
    expect(firstCharge(null)).toBeNull()
  })

  it("extracts Pix QR code details from a charge last_transaction", () => {
    const charge = {
      id: "ch_1",
      status: "pending",
      last_transaction: {
        qr_code: "000201PIX",
        qr_code_url: "https://api.pagar.me/qr.png",
        expires_at: "2026-06-13T12:00:00Z",
      },
    } as PagarmeCharge

    expect(chargePixDetails(charge)).toEqual({
      data: "000201PIX",
      imageUrlPng: "https://api.pagar.me/qr.png",
      imageUrlSvg: null,
      hostedInstructionsUrl: null,
      expiresAt: new Date("2026-06-13T12:00:00Z"),
    })
  })

  it("returns nulls when the charge has no transaction", () => {
    expect(chargePixDetails(null)).toEqual({
      data: null,
      imageUrlPng: null,
      imageUrlSvg: null,
      hostedInstructionsUrl: null,
      expiresAt: null,
    })
  })

  it("returns a clear message when the account requires a document", () => {
    const message = pagarmePixOrderErrorMessage(
      new PagarmeError("The customer document is required.", 422, 422),
    )
    expect(message).toContain("CPF")
  })

  it("returns a clear message for invalid Pagar.me keys", () => {
    const message = pagarmePixOrderErrorMessage(new PagarmeError("Unauthorized", 401, 401))
    expect(message).toContain("Chave secreta da Pagar.me")
    expect(message).toContain("PAGARME_SECRET_KEY")
  })

  it("surfaces the not-configured message (503) verbatim", () => {
    const message = pagarmePixOrderErrorMessage(
      new PagarmeError("Pagamento via Pix ainda nao foi configurado.", 503),
    )
    expect(message).toContain("ainda nao foi configurado")
  })
})
