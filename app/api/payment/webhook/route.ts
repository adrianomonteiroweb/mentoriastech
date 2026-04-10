import { NextResponse } from "next/server"
import Stripe from "stripe"
import nodemailer from "nodemailer"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { newBookingToMentorEmail } from "@/lib/email-templates"

const MENTOR_EMAIL = process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const meta = paymentIntent.metadata

    try {
      const supabase = createAdminClient()

      // Create booking with status "paid"
      const bookingData: Record<string, unknown> = {
        booking_type: meta.bookingType || "paid",
        status: "paid",
        topic_id: meta.topicId,
        session_date: meta.sessionDate,
        start_time: meta.startTime.length === 5 ? meta.startTime + ":00" : meta.startTime,
        notes: `${meta.topicName}${meta.notes ? " - " + meta.notes : ""}`,
        guest_name: meta.name,
        guest_email: meta.email,
        guest_whatsapp: meta.whatsapp,
      }

      if (meta.slotId) {
        bookingData.slot_id = meta.slotId
      }
      if (meta.menteeId) {
        bookingData.mentee_id = meta.menteeId
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select("id")
        .single()

      if (bookingError) {
        console.error("[webhook] Booking insert error:", bookingError)
        return NextResponse.json({ error: "Booking creation failed" }, { status: 500 })
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          amount_cents: paymentIntent.amount,
          currency: paymentIntent.currency,
          method: "pix",
          status: "confirmed",
          pix_txid: paymentIntent.id,
          paid_at: new Date().toISOString(),
        })

      if (paymentError) {
        console.error("[webhook] Payment insert error:", paymentError)
      }

      // Send email to mentor (non-blocking)
      const [y, m, d] = meta.sessionDate.split("-")
      const dateFormatted = `${d}/${m}/${y}`

      sendEmailNotification({
        name: meta.name,
        email: meta.email,
        whatsapp: meta.whatsapp,
        topicName: meta.topicName,
        dateFormatted,
        startTime: meta.startTime,
        bookingType: meta.bookingType as "paid" | "private",
        notes: meta.notes,
      }).catch((err) => console.error("[webhook] Email error:", err))

      console.log(`[webhook] Booking ${booking.id} created for payment ${paymentIntent.id}`)
    } catch (error) {
      console.error("[webhook] Processing error:", error)
      return NextResponse.json({ error: "Processing failed" }, { status: 500 })
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    console.error("[webhook] Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message)
  }

  return NextResponse.json({ received: true })
}

async function sendEmailNotification(params: {
  name: string
  email: string
  whatsapp: string
  topicName: string
  dateFormatted: string
  startTime: string
  bookingType: "paid" | "private"
  notes: string
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

  const { subject, html } = newBookingToMentorEmail({
    name: params.name,
    email: params.email,
    whatsapp: params.whatsapp,
    topic: params.topicName,
    day: params.dateFormatted,
    time: params.startTime,
    bookingType: params.bookingType,
    notes: params.notes || undefined,
  })

  await transporter.sendMail({
    from: `"Mentoria - Adriano Monteiro" <${smtpUser}>`,
    to: MENTOR_EMAIL,
    subject: `[PAGO] ${subject}`,
    html,
    replyTo: params.email,
  })
}
