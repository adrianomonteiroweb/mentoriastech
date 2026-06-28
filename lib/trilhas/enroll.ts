import { and, asc, desc, eq, inArray } from "drizzle-orm"
import nodemailer from "nodemailer"
import {
  bookings,
  db,
  learningTrackPhases,
  learningTracks,
  profiles,
  trackEnrollmentPhases,
  trackEnrollments,
} from "@/lib/db"
import type { NewTrackEnrollmentPhase } from "@/lib/db/schema"
import { toTrackEnrollment } from "@/lib/db/mappers"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { normalizeBookingTime } from "@/lib/db/booking-conflicts"
import { getDefaultMentorId } from "@/lib/utils/auth"
import type { TrackEnrollment, TrackPhaseKey } from "@/lib/types/database"

/**
 * As 6 fases fixas de uma trilha de recolocação. Usadas para semear as
 * `learning_track_phases` ao criar uma trilha e para gerar as fases de uma
 * inscrição.
 */
export const DEFAULT_TRACK_PHASES: {
  phaseKey: TrackPhaseKey
  title: string
  description: string
  isOptional: boolean
}[] = [
  {
    phaseKey: "positioning",
    title: "Posicionamento",
    description: "LinkedIn, currículo, portfólio e conexões.",
    isOptional: false,
  },
  {
    phaseKey: "english",
    title: "Inglês básico A1",
    description:
      "Inglês para iniciantes (A1). Se optar, as entrevistas podem ser em inglês — comprehensible input / slow english.",
    isOptional: true,
  },
  {
    phaseKey: "interview_rh",
    title: "Entrevista RH",
    description: "Simulação de entrevista com RH.",
    isOptional: false,
  },
  {
    phaseKey: "interview_tech",
    title: "Entrevista Tech Lead",
    description: "Entrevista técnica com teste técnico.",
    isOptional: false,
  },
  {
    phaseKey: "interview_manager",
    title: "Entrevista Gestor",
    description: "Entrevista final com o gestor da vaga.",
    isOptional: false,
  },
  {
    phaseKey: "job_search",
    title: "Busca de vagas e acompanhamento",
    description: "Busca de vagas e acompanhamento em processos seletivos.",
    isOptional: false,
  },
]

export class TrackEnrollError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "TrackEnrollError"
    this.status = status
  }
}

export interface EnrollInTrackInput {
  trackId: string
  email: string
  name?: string | null
  whatsapp?: string | null
  targetInternational?: boolean
  includeEnglish?: boolean
  englishInterviews?: boolean
  slotId?: string | null
  sessionDate?: string | null
  startTime?: string | null
  topicId?: string | null
  notes?: string | null
  /** Mentorado recorrente: informa só o email; busca cadastro/agendamento anterior. */
  isReturningMentee?: boolean
  /** Quando chamado de Minhas Mentorias (mentee já autenticado por email). */
  menteeId?: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value))
}

/**
 * Inscreve um mentorado em uma trilha (status `pending`) e gera as fases de
 * acompanhamento. Reusada pela rota pública e pela rota de Minhas Mentorias.
 */
export async function enrollInTrack(
  input: EnrollInTrackInput,
): Promise<{ enrollment: TrackEnrollment }> {
  const normalizedEmail = input.email.trim().toLowerCase()

  const [track] = await db
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.id, input.trackId))
    .limit(1)

  if (!track || !track.isActive) {
    throw new TrackEnrollError("Trilha não encontrada ou indisponível.", 404)
  }

  const templatePhases = await db
    .select()
    .from(learningTrackPhases)
    .where(eq(learningTrackPhases.trackId, track.id))
    .orderBy(asc(learningTrackPhases.sortOrder))

  if (templatePhases.length === 0) {
    throw new TrackEnrollError("Trilha sem fases configuradas.", 400)
  }

  // Resolve o perfil do mentorado (existente ou cria via email).
  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  // Mentorado recorrente: tenta reaproveitar dados de um agendamento anterior.
  const [lastBooking] = existingProfile
    ? [undefined]
    : await db
        .select({
          guestName: bookings.guestName,
          guestWhatsapp: bookings.guestWhatsapp,
        })
        .from(bookings)
        .where(eq(bookings.guestEmail, normalizedEmail))
        .orderBy(desc(bookings.createdAt))
        .limit(1)

  if (input.isReturningMentee && !existingProfile && !lastBooking) {
    throw new TrackEnrollError(
      "Não encontramos mentoria anterior para este email.",
      404,
    )
  }

  const resolvedName =
    input.name?.trim() ||
    existingProfile?.fullName?.trim() ||
    lastBooking?.guestName?.trim() ||
    normalizedEmail.split("@")[0] ||
    "Mentorado"
  const resolvedWhatsapp =
    input.whatsapp?.trim() ||
    existingProfile?.whatsapp ||
    lastBooking?.guestWhatsapp ||
    null

  const mentee =
    existingProfile ||
    (await ensureMenteeProfile({
      email: normalizedEmail,
      fullName: resolvedName,
      whatsapp: resolvedWhatsapp,
    }))

  // Evita inscrições duplicadas na mesma trilha.
  const [duplicate] = await db
    .select({ id: trackEnrollments.id })
    .from(trackEnrollments)
    .where(
      and(
        eq(trackEnrollments.menteeId, mentee.id),
        eq(trackEnrollments.trackId, track.id),
        inArray(trackEnrollments.status, ["pending", "active"]),
      ),
    )
    .limit(1)

  if (duplicate) {
    throw new TrackEnrollError(
      "Você já tem uma inscrição em andamento nesta trilha.",
      409,
    )
  }

  const targetInternational = Boolean(input.targetInternational)
  // Nudge: alvo internacional liga inglês por padrão (se a trilha suportar).
  const includeEnglish =
    track.supportsEnglish &&
    (input.includeEnglish ?? targetInternational)
  const englishInterviews = includeEnglish && Boolean(input.englishInterviews)

  const [enrollment] = await db
    .insert(trackEnrollments)
    .values({
      trackId: track.id,
      menteeId: mentee.id,
      guestName: resolvedName,
      guestEmail: normalizedEmail,
      guestWhatsapp: resolvedWhatsapp,
      targetInternational,
      includeEnglish,
      englishInterviews,
      requestedSlotId: isUuid(input.slotId) ? input.slotId : null,
      requestedSessionDate: input.sessionDate || null,
      requestedStartTime: input.startTime
        ? normalizeBookingTime(input.startTime)
        : null,
      requestedTopicId: isUuid(input.topicId) ? input.topicId : null,
      status: "pending",
      notes: input.notes?.trim() || null,
    })
    .returning()

  // Gera as fases da inscrição a partir do template.
  let firstActionableAssigned = false
  const phaseRows: NewTrackEnrollmentPhase[] = templatePhases.map((phase) => {
    let status: NewTrackEnrollmentPhase["status"]
    if (phase.phaseKey === "english" && !includeEnglish) {
      status = "skipped"
    } else if (!firstActionableAssigned) {
      status = "pending"
      firstActionableAssigned = true
    } else {
      status = "locked"
    }

    return {
      enrollmentId: enrollment.id,
      phaseKey: phase.phaseKey,
      title: phase.title,
      sortOrder: phase.sortOrder,
      status,
    }
  })

  await db.insert(trackEnrollmentPhases).values(phaseRows)

  // Notifica o mentor (não bloqueante).
  void notifyMentorOfEnrollment({
    trackTitle: track.title,
    menteeName: resolvedName,
    menteeEmail: normalizedEmail,
    menteeWhatsapp: resolvedWhatsapp,
    targetInternational,
    includeEnglish,
    sessionDate: input.sessionDate || null,
    startTime: input.startTime || null,
  })

  return { enrollment: toTrackEnrollment(enrollment) }
}

async function notifyMentorOfEnrollment(params: {
  trackTitle: string
  menteeName: string
  menteeEmail: string
  menteeWhatsapp: string | null
  targetInternational: boolean
  includeEnglish: boolean
  sessionDate: string | null
  startTime: string | null
}) {
  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || "587")
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("[trilha] SMTP not configured; enrollment email skipped")
      return
    }

    const mentorId = await getDefaultMentorId()
    const [mentor] = await db
      .select({ email: profiles.email, fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, mentorId))
      .limit(1)

    const mentorEmail =
      mentor?.email || process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    const lines = [
      `Nova inscrição em trilha: ${params.trackTitle}`,
      `Mentorado: ${params.menteeName} (${params.menteeEmail})`,
      params.menteeWhatsapp ? `WhatsApp: ${params.menteeWhatsapp}` : null,
      `Alvo internacional: ${params.targetInternational ? "Sim" : "Não"}`,
      `Inclui inglês A1: ${params.includeEnglish ? "Sim" : "Não"}`,
      params.sessionDate
        ? `Slot sugerido (Fase 1): ${params.sessionDate} ${params.startTime ?? ""}`.trim()
        : null,
      "",
      "Confirme a inscrição no painel para agendar a Fase 1.",
    ].filter(Boolean)

    await transporter.sendMail({
      from: `"Trilhas - MentoriasTech" <${smtpUser}>`,
      to: mentorEmail,
      subject: `Nova inscrição em trilha — ${params.menteeName}`,
      html: `<div style="font-family:sans-serif;line-height:1.6">${lines
        .map((l) => (l === "" ? "<br/>" : `<p>${l}</p>`))
        .join("")}</div>`,
      replyTo: params.menteeEmail,
    })
  } catch (error) {
    console.error("[trilha] Enrollment email error (non-blocking):", error)
  }
}
