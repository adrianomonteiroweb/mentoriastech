import { NextResponse } from "next/server"
import { z } from "zod"
import { stripe } from "@/lib/stripe"

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(1),
  topicId: z.string().min(1),
  topicName: z.string().min(1),
  bookingType: z.enum(["paid", "private"]),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().min(1),
  slotId: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  menteeId: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const data = parsed.data

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // R$50,00
      currency: "brl",
      payment_method_types: ["pix"],
      payment_method_options: {
        pix: { expires_after_seconds: 1800 }, // 30 minutos
      },
      metadata: {
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        topicId: data.topicId,
        topicName: data.topicName,
        bookingType: data.bookingType,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        slotId: data.slotId,
        notes: data.notes,
        menteeId: data.menteeId || "",
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error("[payment/create-intent] Error:", error)
    return NextResponse.json(
      { error: "Erro ao criar pagamento" },
      { status: 500 },
    )
  }
}
