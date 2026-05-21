import { NextResponse } from "next/server"
import { z } from "zod"
import nodemailer from "nodemailer"
import { bookings, db } from "@/lib/db"
import { hasBookingConflict, normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { newBookingToMentorEmail } from "@/lib/email-templates"

const TO_EMAIL = process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().min(1, "WhatsApp é obrigatório"),
  topicId: z.string().min(1, "Tema é obrigatório"),
  topicName: z.string().min(1),
  bookingType: z.enum(["paid", "private"]),
  sessionDate: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário é obrigatório"),
  notes: z.string().optional().default(""),
  menteeId: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados inválidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const data = parsed.data

    if (
      await hasBookingConflict({
        sessionDate: data.sessionDate,
        startTime: data.startTime,
      })
    ) {
      return NextResponse.json(
        { error: "Este horario acabou de ficar indisponivel. Escolha outro horario." },
        { status: 409 },
      )
    }

    // Format date for display
    const [y, m, d] = data.sessionDate.split("-")
    const dateFormatted = `${d}/${m}/${y}`

    const mentee = await ensureMenteeProfile({
      email: data.email,
      fullName: data.name,
      whatsapp: data.whatsapp,
    })

    const bookingData: typeof bookings.$inferInsert = {
      menteeId: mentee.id,
      guestName: data.name,
      guestEmail: data.email.trim().toLowerCase(),
      guestWhatsapp: data.whatsapp,
      bookingType: data.bookingType,
      status: "pending",
      topicId: data.topicId,
      sessionDate: data.sessionDate,
      startTime: normalizeBookingTime(data.startTime),
      notes: `${data.topicName}${data.notes ? " - " + data.notes : ""}`,
    }

    try {
      await db.insert(bookings).values(bookingData)
    } catch (insertError) {
      console.error("[booking/paid] Insert error:", insertError)
      return NextResponse.json(
        { error: "Erro ao salvar agendamento" },
        { status: 500 },
      )
    }

    // Send email notification to mentor (non-blocking)
    try {
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = Number(process.env.SMTP_PORT || "587")
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        })

        const { subject, html } = newBookingToMentorEmail({
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          topic: data.topicName,
          day: dateFormatted,
          time: data.startTime,
          bookingType: data.bookingType,
          notes: data.notes || undefined,
        })

        await transporter.sendMail({
          from: `"Mentoria - Adriano Monteiro" <${smtpUser}>`,
          to: TO_EMAIL,
          subject,
          html,
          replyTo: data.email,
        })
      }
    } catch (emailError) {
      console.error("[booking/paid] Email error (non-blocking):", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[booking/paid] Error:", error)
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 },
    )
  }
}
