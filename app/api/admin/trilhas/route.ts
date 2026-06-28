import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { z } from "zod"
import { requireMentorAccess } from "@/lib/utils/auth"
import { db, learningTrackPhases, learningTracks } from "@/lib/db"
import { toLearningTrack } from "@/lib/db/mappers"
import { DEFAULT_TRACK_PHASES } from "@/lib/trilhas/enroll"

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  supports_english: z.boolean().default(false),
  english_paid_mentorship_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "trilha"
  let candidate = root
  let attempt = 0
  // Tenta sufixos curtos até achar um slug livre.
  while (attempt < 50) {
    const [existing] = await db
      .select({ id: learningTracks.id })
      .from(learningTracks)
      .where(eq(learningTracks.slug, candidate))
      .limit(1)
    if (!existing) return candidate
    attempt += 1
    candidate = `${root}-${attempt + 1}`
  }
  return `${root}-${Date.now()}`
}

export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select()
      .from(learningTracks)
      .orderBy(asc(learningTracks.sortOrder))

    return NextResponse.json({ data: rows.map(toLearningTrack) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const slug = await uniqueSlug(slugify(data.title))

    const [track] = await db
      .insert(learningTracks)
      .values({
        title: data.title,
        slug,
        description: data.description || null,
        coverImageUrl: data.cover_image_url || null,
        supportsEnglish: data.supports_english,
        englishPaidMentorshipId: data.english_paid_mentorship_id || null,
        isActive: data.is_active,
        sortOrder: data.sort_order,
        createdBy: profile.id,
      })
      .returning()

    // Semeia as 6 fases-template fixas.
    await db.insert(learningTrackPhases).values(
      DEFAULT_TRACK_PHASES.map((phase, index) => ({
        trackId: track.id,
        phaseKey: phase.phaseKey,
        title: phase.title,
        description: phase.description,
        sortOrder: index + 1,
        isOptional: phase.isOptional,
      })),
    )

    return NextResponse.json({ data: toLearningTrack(track) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
