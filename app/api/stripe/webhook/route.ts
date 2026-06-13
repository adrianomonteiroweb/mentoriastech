import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import nodemailer from "nodemailer"
import type Stripe from "stripe"
import { bookings, db, paidMentorships, payments } from "@/lib/db"
import { paidMentorshipPaidToMentorEmail } from "@/lib/email-templates"
import {
  getStripe,
  paymentIntentPixDetails,
  paymentIntentStatusToPaymentStatus,
} from "@/lib/stripe"

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

async function handlePaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const pix = paymentIntentPixDetails(paymentIntent)
  const paymentStatus = paymentIntentStatusToPaymentStatus(paymentIntent.status)
  const paidAt = paymentStatus === "confirmed" ? new Date() : null

  const [payment] = await db
    .update(payments)
    .set({
      status: paymentStatus,
      stripePaymentIntentStatus: paymentIntent.status,
      pixQrCodeData: pix.data,
      pixQrCodeImageUrlPng: pix.imageUrlPng,
      pixQrCodeImageUrlSvg: pix.imageUrlSvg,
      pixHostedInstructionsUrl: pix.hostedInstructionsUrl,
      pixExpiresAt: pix.expiresAt,
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
    .returning()

  if (!payment) return

  if (paymentStatus === "confirmed") {
    await db
      .update(bookings)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(bookings.id, payment.bookingId))

    const [row] = await db
      .select({
        booking: bookings,
        mentorship: paidMentorships,
      })
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

  if (paymentStatus === "failed") {
    await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, payment.bookingId))
  }
}

export async function POST(request: Request) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!endpointSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET nao configurada" },
      { status: 500 },
    )
  }

  const stripe = getStripe()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook invalido"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
      case "payment_intent.processing":
        await handlePaymentIntent(event.data.object as Stripe.PaymentIntent)
        break
      default:
        break
    }
  } catch (error) {
    console.error("[stripe/webhook] Error:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
