import { NextResponse } from "next/server"
import { and, eq, ne } from "drizzle-orm"
import nodemailer from "nodemailer"
import { bookings, db, paidMentorships, payments } from "@/lib/db"
import { paidMentorshipPaidToMentorEmail } from "@/lib/email-templates"
import {
  extractChargeFromEvent,
  verifyWebhookBasicAuth,
  type PagarmeCharge,
  type PagarmeWebhookEvent,
} from "@/lib/pagarme"

export const runtime = "nodejs"

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100)
}

async function sendMentorPaymentConfirmedEmail(params: {
  to: string
  name: string
  email: string
  whatsapp?: string | null
  mentorshipTitle: string
  sessionDate: string
  startTime: string
  amountFormatted: string
}) {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT || "587")
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpUser || !smtpPass) return

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  })

  const { subject, html } = paidMentorshipPaidToMentorEmail({
    name: params.name,
    email: params.email,
    whatsapp: params.whatsapp || undefined,
    mentorshipTitle: params.mentorshipTitle,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    amountFormatted: params.amountFormatted,
  })

  await transporter.sendMail({
    from: `"Mentoria - Adriano Monteiro" <${smtpUser}>`,
    to: params.to,
    subject,
    html,
    replyTo: params.email,
  })
}

async function confirmPayment(charge: PagarmeCharge) {
  // Idempotencia: so confirma e envia email quando ainda nao estava confirmado.
  const [payment] = await db
    .update(payments)
    .set({
      status: "confirmed",
      pagarmeStatus: charge.status,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.pagarmeChargeId, charge.id), ne(payments.status, "confirmed")))
    .returning()

  if (!payment) return // ja confirmado anteriormente (ou charge desconhecido)

  await db
    .update(bookings)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(bookings.id, payment.bookingId))

  const [row] = await db
    .select({ booking: bookings, mentorship: paidMentorships })
    .from(bookings)
    .leftJoin(paidMentorships, eq(bookings.paidMentorshipId, paidMentorships.id))
    .where(eq(bookings.id, payment.bookingId))
    .limit(1)

  if (row?.mentorship && row.booking.sessionDate && row.booking.startTime) {
    await sendMentorPaymentConfirmedEmail({
      to: row.mentorship.mentorEmail,
      name: row.booking.guestName || "Mentorado",
      email: row.booking.guestEmail || "",
      whatsapp: row.booking.guestWhatsapp,
      mentorshipTitle: row.mentorship.title,
      sessionDate: row.booking.sessionDate,
      startTime: row.booking.startTime,
      amountFormatted: formatCurrency(payment.amountCents, payment.currency),
    })
  }
}

async function failPayment(charge: PagarmeCharge, status: "failed" | "refunded") {
  const [payment] = await db
    .update(payments)
    .set({ status, pagarmeStatus: charge.status, updatedAt: new Date() })
    .where(eq(payments.pagarmeChargeId, charge.id))
    .returning()

  if (payment && status === "failed") {
    await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, payment.bookingId))
  }
}

export async function POST(request: Request) {
  const authorized = verifyWebhookBasicAuth(request.headers.get("authorization"), {
    user: process.env.PAGARME_WEBHOOK_USER,
    pass: process.env.PAGARME_WEBHOOK_PASSWORD,
  })
  if (authorized === null) {
    return NextResponse.json(
      { error: "Webhook da Pagar.me nao configurado (PAGARME_WEBHOOK_USER/PASSWORD)" },
      { status: 500 },
    )
  }
  if (!authorized) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  let event: PagarmeWebhookEvent
  try {
    event = (await request.json()) as PagarmeWebhookEvent
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    const type = event.type || ""
    const charge = extractChargeFromEvent(event)

    if (charge?.id) {
      if (type === "charge.paid" || type === "order.paid") {
        await confirmPayment(charge)
      } else if (type === "charge.refunded") {
        await failPayment(charge, "refunded")
      } else if (
        type === "charge.payment_failed" ||
        type === "order.payment_failed" ||
        type === "charge.canceled" ||
        type === "order.canceled"
      ) {
        await failPayment(charge, "failed")
      }
    }
  } catch (error) {
    console.error("[pagarme/webhook] Error:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
