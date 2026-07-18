import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, profiles } from "@/lib/db"
import {
  MenteeAccessError,
  normalizeEmail,
  requireMenteeAccess,
} from "@/lib/utils/mentee-access"
import { enrollInTrack, TrackEnrollError } from "@/lib/trilhas/enroll"
import { optionalWhatsAppSchema } from "@/lib/whatsapp-schema"
import {
  getActiveTracksWithPhases,
  getEnrollmentsForMentee,
} from "@/lib/trilhas/queries"

const enrollSchema = z.object({
  trackId: z.string().uuid(),
  name: z.string().optional(),
  whatsapp: optionalWhatsAppSchema,
  targetInternational: z.boolean().optional(),
  includeEnglish: z.boolean().optional(),
  englishInterviews: z.boolean().optional(),
  slotId: z.string().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione um horario"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Selecione um horario"),
  topicId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

async function resolveMenteeId(email: string): Promise<string | null> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, normalizeEmail(email)))
    .limit(1)
  return profile?.id ?? null
}

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const menteeId = await resolveMenteeId(session.email)

    const [enrollments, tracks] = await Promise.all([
      menteeId ? getEnrollmentsForMentee(menteeId) : Promise.resolve([]),
      getActiveTracksWithPhases(),
    ])

    return NextResponse.json({ data: { enrollments, tracks } })
  } catch (error) {
    if (error instanceof MenteeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const body = await request.json()

    const parsed = enrollSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { enrollment } = await enrollInTrack({
      ...parsed.data,
      email: session.email,
    })

    return NextResponse.json({ success: true, enrollment }, { status: 201 })
  } catch (error) {
    if (error instanceof MenteeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof TrackEnrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[minhas-mentorias trilha] Error:", error)
    return NextResponse.json({ error: "Erro ao processar inscricao" }, { status: 500 })
  }
}
