import { describe, expect, it } from "vitest"
import {
  PagarmeError,
  chargeFailureReason,
  chargePixDetails,
  chargeStatusToPaymentStatus,
  createPixCharge,
  firstCharge,
  pagarmePixOrderErrorMessage,
  type PagarmeClient,
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

  it("builds a readable failure reason from a failed charge", () => {
    const charge = {
      id: "ch_1",
      status: "failed",
      last_transaction: {
        status: "failed",
        success: false,
        acquirer_message: "Pix nao habilitado para o recebedor",
        gateway_response: {
          code: "400",
          errors: [{ message: "recipient has no pix key" }],
        },
      },
    } as PagarmeCharge

    const reason = chargeFailureReason(charge)
    expect(reason).toContain("Pix nao habilitado para o recebedor")
    expect(reason).toContain("gateway 400")
    expect(reason).toContain("recipient has no pix key")
  })

  it("falls back to 'sem detalhes' when no failure data is present", () => {
    expect(chargeFailureReason(null)).toBe("sem detalhes")
    expect(chargeFailureReason({ id: "ch_2", status: "failed" } as PagarmeCharge)).toBe(
      "sem detalhes",
    )
  })

  it("forwards customer document and phone into the order payload", async () => {
    let body: any = null
    const client: PagarmeClient = {
      baseUrl: "https://api.pagar.me/core/v5",
      request: async (_method, _path, b) => {
        body = b
        return { id: "or_1", status: "pending", charges: [] } as PagarmeOrder as never
      },
    }

    await createPixCharge(client, {
      amountCents: 6000,
      description: "Mentoria",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      customerDocument: "390.533.447-05",
      customerPhone: "(85) 99999-9999",
      expiresIn: 3600,
    })

    expect(body.customer.document).toBe("39053344705")
    expect(body.customer.document_type).toBe("cpf")
    expect(body.customer.phones).toEqual({
      mobile_phone: { country_code: "55", area_code: "85", number: "999999999" },
    })
  })

  it("omits phones when the number is unusable", async () => {
    let body: any = null
    const client: PagarmeClient = {
      baseUrl: "https://api.pagar.me/core/v5",
      request: async (_method, _path, b) => {
        body = b
        return { id: "or_2", status: "pending", charges: [] } as PagarmeOrder as never
      },
    }

    await createPixCharge(client, {
      amountCents: 6000,
      description: "Mentoria",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      customerPhone: "123",
      expiresIn: 3600,
    })

    expect(body.customer.phones).toBeUndefined()
  })
})
