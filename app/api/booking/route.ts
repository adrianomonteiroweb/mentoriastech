import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { bookings, db, profiles } from "@/lib/db"
import { hasBookingConflict, normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { newBookingToMentorEmail } from "@/lib/email-templates"

const TO_EMAIL = process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Email invalido"),
  whatsapp: z.string().optional(),
  day: z.string().min(1, "Dia e obrigatorio"),
  time: z.string().min(1, "Horario e obrigatorio"),
  topic: z.string().min(1, "Tema e obrigatorio"),
  slotId: z.string().optional(),
  topicId: z.string().optional(),
  sessionDate: z.string().optional(),
  isReturningMentee: z.boolean().optional(),
  originCategory: z.enum(["linkedin", "palestra", "indicacao", "instagram", "evento"]).optional(),
  originDescription: z.string().max(500).optional(),
})

const ORIGIN_LABELS = {
  linkedin: "LinkedIn",
  palestra: "Palestra",
  indicacao: "Indicacao",
  instagram: "Instagram",
  evento: "Evento",
} as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPersistedId(id: string | undefined) {
  return Boolean(id && UUID_PATTERN.test(id))
}

async function findReturningMentee(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  const [latestBooking] = await db
    .select({
      guestName: bookings.guestName,
      guestWhatsapp: bookings.guestWhatsapp,
    })
    .from(bookings)
    .where(eq(bookings.guestEmail, normalizedEmail))
    .orderBy(desc(bookings.createdAt))
    .limit(1)

  if (!profile && !latestBooking) return null

  return {
    profile,
    name:
      profile?.fullName?.trim() ||
      latestBooking?.guestName?.trim() ||
      normalizedEmail.split("@")[0] ||
      "Mentorado",
    whatsapp: profile?.whatsapp?.trim() || latestBooking?.guestWhatsapp?.trim() || "",
  }
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
    const isReturningMentee = data.isReturningMentee === true
    const providedName = data.name?.trim() || ""
    const providedWhatsapp = data.whatsapp?.trim() || ""
    const originDescription = data.originDescription?.trim() || null
    const originNotes = isReturningMentee
      ? "Mentorado recorrente"
      : data.originCategory
        ? `Origem: ${ORIGIN_LABELS[data.originCategory]}${originDescription ? ` - ${originDescription}` : ""}`
        : null
    let notificationName = providedName || data.email
    let notificationWhatsapp: string | undefined = providedWhatsapp || undefined

    if (!isReturningMentee && !providedName) {
      return NextResponse.json(
        { error: "Nome e obrigatorio" },
        { status: 400 },
      )
    }

    if (!isReturningMentee && !providedWhatsapp) {
      return NextResponse.json(
        { error: "WhatsApp e obrigatorio" },
        { status: 400 },
      )
    }

    if (!isReturningMentee && !data.originCategory) {
      return NextResponse.json(
        { error: "Informe onde conheceu a mentoria" },
        { status: 400 },
      )
    }

    try {
      if (
        await hasBookingConflict({
          sessionDate: data.sessionDate,
          startTime: data.time,
        })
      ) {
        return NextResponse.json(
          { error: "Este horario acabou de ficar indisponivel. Escolha outro horario." },
          { status: 409 },
        )
      }

      const returningMentee = isReturningMentee
        ? await findReturningMentee(data.email)
        : null

      if (isReturningMentee && !returningMentee) {
        return NextResponse.json(
          { error: "Nao encontramos mentoria anterior para este email." },
          { status: 404 },
        )
      }

      const guestName = isReturningMentee
        ? returningMentee!.name
        : providedName
      const guestWhatsapp = isReturningMentee
        ? returningMentee!.whatsapp
        : providedWhatsapp

      const mentee = isReturningMentee && returningMentee?.profile
        ? returningMentee.profile
        : await ensureMenteeProfile({
            email: data.email,
            fullName: guestName,
            whatsapp: guestWhatsapp || null,
            originCategory: data.originCategory || null,
            originDescription,
            updateOriginIfMissing: Boolean(data.originCategory),
          })

      const bookingData: typeof bookings.$inferInsert = {
        menteeId: mentee.id,
        guestName,
        guestEmail: data.email.trim().toLowerCase(),
        guestWhatsapp,
        bookingType: "free",
        status: "pending",
        notes: [
          `Tema: ${data.topic}`,
          `Dia: ${data.day}`,
          `Horario: ${data.time}`,
          originNotes,
        ].filter(Boolean).join(" | "),
      }
      notificationName = guestName || data.email
      notificationWhatsapp = guestWhatsapp || undefined

      if (data.originCategory) {
        bookingData.originCategory = data.originCategory
        bookingData.originDescription = originDescription
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
        bookingData.startTime = normalizeBookingTime(data.time)
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
          name: notificationName,
          email: data.email,
          whatsapp: notificationWhatsapp,
          topic: data.topic,
          day: data.day,
          time: data.time,
          bookingType: "free",
          notes: originNotes || undefined,
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
