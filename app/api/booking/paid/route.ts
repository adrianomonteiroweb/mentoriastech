import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import nodemailer from "nodemailer"
import { z } from "zod"
import {
  bookings,
  db,
  mentoringSlots,
  paidMentorships,
  payments,
} from "@/lib/db"
import { hasBookingConflict, normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { toPayment, toPublicPaidMentorship } from "@/lib/db/mappers"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { paidMentorshipRequestToMentorEmail } from "@/lib/email-templates"
import {
  PagarmeError,
  chargeFailureDetail,
  chargePixDetails,
  chargeStatusToPaymentStatus,
  createPixOrder,
  firstCharge,
  getCharge,
  getOrder,
  pagarmePixOrderErrorMessage,
} from "@/lib/pagarme"

export const runtime = "nodejs"

function formatZodError(error: z.ZodError) {
  const issue = error.errors[0]
  if (!issue) return "Dados invalidos"
  const path = issue.path.join(".")
  return path ? `${path}: ${issue.message}` : issue.message
}

const createSchema = z.object({
  paidMentorshipId: z.string().uuid("Mentoria paga invalida"),
  name: z.string().trim().min(2, "Nome e obrigatorio"),
  email: z.string().trim().email("Email invalido"),
  whatsapp: z.string().trim().min(1, "WhatsApp e obrigatorio"),
  document: z.string().trim().max(20).optional().default(""),
  slotId: z.string().uuid().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Horario invalido"),
  notes: z.string().trim().max(2000).optional().default(""),
})

const statusSchema = z.object({
  bookingId: z.string().uuid(),
  paymentId: z.string().uuid(),
})

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100)
}

function formatDateBR(date: string) {
  return date.split("-").reverse().join("/")
}

async function sendMentorRequestEmail(params: {
  to: string
  name: string
  email: string
  whatsapp: string
  mentorshipTitle: string
  sessionDate: string
  startTime: string
  amountFormatted: string
  notes?: string
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

  const { subject, html } = paidMentorshipRequestToMentorEmail(params)

  await transporter.sendMail({
    from: `"MentoriasTech" <${smtpUser}>`,
    to: params.to,
    subject,
    html,
    replyTo: params.email,
  })
}

async function syncPagarmeCharge(
  paymentId: string,
  bookingId: string,
  chargeId: string | null,
  orderId: string | null,
) {
  const charge = chargeId
    ? await getCharge(chargeId)
    : firstCharge(await getOrder(orderId as string))

  const pix = chargePixDetails(charge)
  const nextPaymentStatus = chargeStatusToPaymentStatus(charge?.status ?? "pending")
  const paidAt = nextPaymentStatus === "confirmed" ? new Date() : null

  const [payment] = await db
    .update(payments)
    .set({
      status: nextPaymentStatus,
      pagarmeChargeId: charge?.id ?? chargeId,
      pagarmeStatus: charge?.status ?? null,
      pixQrCodeData: pix.data,
      pixQrCodeImageUrlPng: pix.imageUrlPng,
      pixQrCodeImageUrlSvg: pix.imageUrlSvg,
      pixHostedInstructionsUrl: pix.hostedInstructionsUrl,
      pixExpiresAt: pix.expiresAt,
      paidAt,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, paymentId), eq(payments.bookingId, bookingId)))
    .returning()

  if (payment && nextPaymentStatus === "confirmed") {
    await db
      .update(bookings)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
  }

  if (payment && nextPaymentStatus === "failed") {
    await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
  }

  return payment
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = statusSchema.safeParse({
      bookingId: searchParams.get("bookingId"),
      paymentId: searchParams.get("paymentId"),
    })

    if (!parsed.success) {
      console.error("[booking/paid/status] validation failed", parsed.error.flatten().fieldErrors)
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const [row] = await db
      .select({ payment: payments, booking: bookings })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(
        and(
          eq(payments.id, parsed.data.paymentId),
          eq(payments.bookingId, parsed.data.bookingId),
        ),
      )
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Pagamento nao encontrado" }, { status: 404 })
    }

    let payment = row.payment
    if (
      payment.status === "pending" &&
      (payment.pagarmeChargeId || payment.pagarmeOrderId) &&
      process.env.PAGARME_SECRET_KEY
    ) {
      try {
        payment = await syncPagarmeCharge(
          parsed.data.paymentId,
          parsed.data.bookingId,
          payment.pagarmeChargeId,
          payment.pagarmeOrderId,
        ) || payment
      } catch (syncError) {
        // Erro transitorio da Pagar.me nao deve quebrar o polling: devolve a linha em cache.
        console.error("[booking/paid/status] Pagar.me sync error (non-blocking):", syncError)
      }
    }

    const bookingStatus =
      payment.status === "confirmed"
        ? "paid"
        : payment.status === "failed"
          ? "cancelled"
          : row.booking.status

    return NextResponse.json({
      data: {
        booking_status: bookingStatus,
        payment: toPayment(payment),
      },
    })
  } catch (error) {
    console.error("[booking/paid/status] Error:", error)
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      console.error("[booking/paid] validation failed", parsed.error.flatten().fieldErrors)
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const data = parsed.data
    const normalizedEmail = data.email.toLowerCase()
    const normalizedTime = normalizeBookingTime(data.startTime)

    const [mentorship] = await db
      .select()
      .from(paidMentorships)
      .where(
        and(
          eq(paidMentorships.id, data.paidMentorshipId),
          eq(paidMentorships.isActive, true),
        ),
      )
      .limit(1)

    if (!mentorship) {
      return NextResponse.json({ error: "Mentoria paga nao encontrada" }, { status: 404 })
    }

    if (data.slotId) {
      const [slot] = await db
        .select()
        .from(mentoringSlots)
        .where(eq(mentoringSlots.id, data.slotId))
        .limit(1)

      if (!slot || !slot.isActive || slot.slotType !== "paid") {
        return NextResponse.json({ error: "Horario pago invalido" }, { status: 400 })
      }
    }

    if (
      await hasBookingConflict({
        sessionDate: data.sessionDate,
        startTime: normalizedTime,
        mentorId: mentorship.mentorId,
      })
    ) {
      return NextResponse.json(
        { error: "Este horario acabou de ficar indisponivel. Escolha outro horario." },
        { status: 409 },
      )
    }

    const mentee = await ensureMenteeProfile({
      email: normalizedEmail,
      fullName: data.name,
      whatsapp: data.whatsapp,
    })

    const [booking] = await db
      .insert(bookings)
      .values({
        mentorId: mentorship.mentorId,
        menteeId: mentee.id,
        guestName: data.name,
        guestEmail: normalizedEmail,
        guestWhatsapp: data.whatsapp,
        slotId: data.slotId || null,
        paidMentorshipId: mentorship.id,
        bookingType: "paid",
        status: "payment_pending",
        sessionDate: data.sessionDate,
        startTime: normalizedTime,
        notes: [
          `Mentoria paga: ${mentorship.title}`,
          data.notes ? `Observacoes: ${data.notes}` : null,
        ].filter(Boolean).join(" | "),
      })
      .returning()

    let order
    try {
      order = await createPixOrder({
        amountCents: mentorship.amountCents,
        description: `Mentoria paga: ${mentorship.title}`,
        customerName: data.name,
        customerEmail: normalizedEmail,
        customerDocument: data.document || null,
        expiresIn: mentorship.pixExpiresAfterSeconds,
        metadata: {
          booking_id: booking.id,
          paid_mentorship_id: mentorship.id,
          mentee_id: mentee.id,
        },
      })
    } catch (pagarmeError) {
      await db
        .update(bookings)
        .set({
          status: "cancelled",
          adminNotes: `Falha ao criar Pix Pagar.me: ${(pagarmeError as Error).message}`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))

      console.error("[booking/paid] Pagar.me error:", pagarmeError)
      return NextResponse.json(
        { error: pagarmePixOrderErrorMessage(pagarmeError) },
        { status: pagarmeError instanceof PagarmeError ? pagarmeError.status : 502 },
      )
    }

    const charge = firstCharge(order)
    const pix = chargePixDetails(charge)
    const paymentStatus = chargeStatusToPaymentStatus(charge?.status ?? "pending")

    if (!pix.data && paymentStatus === "pending") {
      await db
        .update(bookings)
        .set({
          status: "cancelled",
          adminNotes: `Pix Pagar.me sem QR Code (order ${order.id}).`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))

      console.error("[booking/paid] Pagar.me order without QR code:", {
        orderId: order.id,
        orderStatus: order.status,
        chargeId: charge?.id,
        chargeStatus: charge?.status,
        detail: chargeFailureDetail(charge),
        lastTransaction: charge?.last_transaction,
      })
      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix. Tente novamente em instantes." },
        { status: 502 },
      )
    }

    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        paidMentorshipId: mentorship.id,
        amountCents: mentorship.amountCents,
        currency: mentorship.currency,
        method: "pix",
        status: paymentStatus,
        pagarmeOrderId: order.id,
        pagarmeChargeId: charge?.id ?? null,
        pagarmeStatus: charge?.status ?? null,
        pixTxid: charge?.id ?? order.id,
        pixQrCodeData: pix.data,
        pixQrCodeImageUrlPng: pix.imageUrlPng,
        pixQrCodeImageUrlSvg: pix.imageUrlSvg,
        pixHostedInstructionsUrl: pix.hostedInstructionsUrl,
        pixExpiresAt: pix.expiresAt,
        paidAt: paymentStatus === "confirmed" ? new Date() : null,
      })
      .returning()

    if (paymentStatus === "confirmed") {
      await db
        .update(bookings)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(bookings.id, booking.id))
    }

    sendMentorRequestEmail({
      to: mentorship.mentorEmail,
      name: data.name,
      email: normalizedEmail,
      whatsapp: data.whatsapp,
      mentorshipTitle: mentorship.title,
      sessionDate: data.sessionDate,
      startTime: normalizedTime,
      amountFormatted: formatCurrency(mentorship.amountCents, mentorship.currency),
      notes: data.notes || undefined,
    }).catch((emailError) => {
      console.error("[booking/paid] Email error (non-blocking):", emailError)
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: paymentStatus === "confirmed" ? "paid" : "payment_pending",
        session_date: booking.sessionDate,
        start_time: booking.startTime,
        date_label: formatDateBR(data.sessionDate),
      },
      payment: {
        ...toPayment(payment),
        pix: {
          qr_code_data: pix.data,
          qr_code_image_url_png: pix.imageUrlPng,
          qr_code_image_url_svg: pix.imageUrlSvg,
          hosted_instructions_url: pix.hostedInstructionsUrl,
          expires_at: pix.expiresAt?.toISOString() ?? null,
        },
      },
      paid_mentorship: toPublicPaidMentorship(mentorship),
    })
  } catch (error) {
    console.error("[booking/paid] Error:", error)
    const message = (error as Error).message || "Erro ao processar solicitacao"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
