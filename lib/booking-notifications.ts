import nodemailer from "nodemailer"
import {
  bookingCancelledEmail,
  bookingCompletedEmail,
  bookingConfirmedEmail,
  bookingPaymentPendingEmail,
  bookingScheduledEmail,
} from "@/lib/email-templates"
import type { BookingStatus } from "@/lib/types/database"

export interface BookingStatusEmailParams {
  status: BookingStatus
  menteeEmail?: string | null
  menteeName: string
  topicName: string
  sessionDate?: string | null
  startTime?: string | null
  bookingType: string
  googleEventId?: string | null
  googleMeetUrl?: string | null
  guestWhatsapp?: string | null
}

/**
 * Envia ao mentorado o e-mail correspondente à mudança de status do
 * agendamento. Não bloqueia o fluxo: erros são apenas logados.
 */
export async function sendBookingStatusEmail(
  params: BookingStatusEmailParams,
): Promise<void> {
  try {
    if (!params.menteeEmail) return

    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpPort = Number(process.env.SMTP_PORT || "587")

    if (!smtpHost || !smtpUser || !smtpPass) return

    const statusParams = {
      menteeName: params.menteeName,
      topicName: params.topicName,
      sessionDate: params.sessionDate || undefined,
      startTime: params.startTime || undefined,
      bookingType: params.bookingType,
      googleEventId: params.googleEventId,
      googleMeetUrl: params.googleMeetUrl,
      guestWhatsapp: params.guestWhatsapp || undefined,
    }

    let emailContent: { subject: string; html: string } | null = null

    switch (params.status) {
      case "confirmed":
        emailContent = bookingConfirmedEmail(statusParams)
        break
      case "payment_pending":
        emailContent = bookingPaymentPendingEmail(statusParams)
        break
      case "scheduled":
        emailContent = bookingScheduledEmail(statusParams)
        break
      case "completed":
        emailContent = bookingCompletedEmail(statusParams)
        break
      case "cancelled":
        emailContent = bookingCancelledEmail(statusParams)
        break
    }

    if (!emailContent) return

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"MentoriasTech" <${smtpUser}>`,
      to: params.menteeEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    })
  } catch (emailError) {
    console.error("[bookings] Email notification error (non-blocking):", emailError)
  }
}
