import { NextResponse } from "next/server"
import { z } from "zod"
import {
  PagarmeError,
  chargePixDetails,
  createPixOrder,
  firstCharge,
  pagarmePixOrderErrorMessage,
} from "@/lib/pagarme"

export const runtime = "nodejs"

const schema = z.object({
  email: z.string().trim().email("Email invalido"),
  amountCents: z.number().int().min(100, "Valor minimo: R$1").max(100_000, "Valor maximo: R$1.000"),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.errors[0]
    const path = issue?.path.join(".")
    const message = path ? `${path}: ${issue.message}` : (issue?.message ?? "Dados invalidos")
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { email, amountCents } = parsed.data

  try {
    const order = await createPixOrder({
      amountCents,
      description: "Doacao voluntaria - MentoriasTech",
      customerName: "Doador",
      customerEmail: email,
      expiresIn: 3600,
      metadata: { source: "donate_widget" },
    })

    const charge = firstCharge(order)
    const pix = chargePixDetails(charge)

    if (!pix.data && !pix.imageUrlPng) {
      return NextResponse.json(
        { error: "Nao foi possivel gerar o QR Code PIX. Tente novamente." },
        { status: 502 },
      )
    }

    return NextResponse.json({
      data: {
        qr_code_data: pix.data,
        qr_code_image_url_png: pix.imageUrlPng,
        expires_at: pix.expiresAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    const status = error instanceof PagarmeError ? error.status : 500
    return NextResponse.json(
      { error: pagarmePixOrderErrorMessage(error) },
      { status: Math.min(status, 502) },
    )
  }
}
