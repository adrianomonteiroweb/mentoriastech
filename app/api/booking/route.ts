import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { bookings, db } from "@/lib/db"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { newBookingToMentorEmail } from "@/lib/email-templates"

const TO_EMAIL = process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"

const schema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  email: z.string().email("Email invalido"),
  whatsapp: z.string().min(1, "WhatsApp e obrigatorio"),
  day: z.string().min(1, "Dia e obrigatorio"),
  time: z.string().min(1, "Horario e obrigatorio"),
  topic: z.string().min(1, "Tema e obrigatorio"),
  slotId: z.string().optional(),
  topicId: z.string().optional(),
  sessionDate: z.string().optional(),
})

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeTime(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

function isPersistedId(id: string | undefined) {
  return Boolean(id && UUID_PATTERN.test(id))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const data = parsed.data

    try {
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
        bookingType: "free",
        status: "pending",
        notes: `Tema: ${data.topic} | Dia: ${data.day} | Horario: ${data.time}`,
      }

      if (isPersistedId(data.slotId)) {
        bookingData.slotId = data.slotId
      }

      if (isPersistedId(data.topicId)) {
        bookingData.topicId = data.topicId
      }

      if (data.sessionDate) {
        bookingData.sessionDate = data.sessionDate
      }

      if (data.time) {
        bookingData.startTime = normalizeTime(data.time)
      }

      await db.insert(bookings).values(bookingData)
    } catch (dbError) {
      console.error("[booking] Insert error:", dbError)
      return NextResponse.json(
        { error: "Erro ao salvar solicitacao de mentoria" },
        { status: 500 },
      )
    }

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
          topic: data.topic,
          day: data.day,
          time: data.time,
          bookingType: "free",
        })

        await transporter.sendMail({
          from: `"Mentoria - Adriano Monteiro" <${smtpUser}>`,
          to: TO_EMAIL,
          subject,
          html,
          replyTo: data.email,
        })
      } else {
        console.warn("[booking] SMTP not configured; email notification skipped")
      }
    } catch (emailError) {
      console.error("[booking] Email error (non-blocking):", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[booking] Error:", error)
    return NextResponse.json(
      { error: "Erro ao processar solicitacao" },
      { status: 500 },
    )
  }
}
