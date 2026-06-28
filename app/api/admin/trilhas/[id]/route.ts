import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { requireMentorAccess } from "@/lib/utils/auth"
import {
  db,
  learningTrackPhases,
  learningTracks,
  trackPhaseContent,
} from "@/lib/db"
import { toLearningTrack } from "@/lib/db/mappers"
import { getTrackWithPhases } from "@/lib/trilhas/queries"
import { TRACK_PHASE_KEYS } from "@/lib/db/schema"

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  supports_english: z.boolean().optional(),
  english_paid_mentorship_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
  // Vínculos de conteúdo por fase (substitui os existentes para cada fase enviada).
  phase_content: z
    .array(
      z.object({
        phase_key: z.enum(TRACK_PHASE_KEYS),
        content_ids: z.array(z.string().uuid()),
      }),
    )
    .optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const track = await getTrackWithPhases(id)
    if (!track) {
      return NextResponse.json({ error: "Trilha nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: track })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const updateData: Partial<typeof learningTracks.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.cover_image_url !== undefined)
      updateData.coverImageUrl = data.cover_image_url || null
    if (data.supports_english !== undefined)
      updateData.supportsEnglish = data.supports_english
    if (data.english_paid_mentorship_id !== undefined)
      updateData.englishPaidMentorshipId = data.english_paid_mentorship_id || null
    if (data.is_active !== undefined) updateData.isActive = data.is_active
    if (data.sort_order !== undefined) updateData.sortOrder = data.sort_order

    const [track] = await db
      .update(learningTracks)
      .set(updateData)
      .where(eq(learningTracks.id, id))
      .returning()

    if (!track) {
      return NextResponse.json({ error: "Trilha nao encontrada" }, { status: 404 })
    }

    // Atualiza vínculos de conteúdo por fase, se enviados.
    if (data.phase_content) {
      for (const entry of data.phase_content) {
        const [phase] = await db
          .select({ id: learningTrackPhases.id })
          .from(learningTrackPhases)
          .where(
            and(
              eq(learningTrackPhases.trackId, track.id),
              eq(learningTrackPhases.phaseKey, entry.phase_key),
            ),
          )
          .limit(1)

        if (!phase) continue

        await db
          .delete(trackPhaseContent)
          .where(eq(trackPhaseContent.phaseId, phase.id))

        if (entry.content_ids.length > 0) {
          await db.insert(trackPhaseContent).values(
            entry.content_ids.map((contentId, index) => ({
              phaseId: phase.id,
              contentId,
              sortOrder: index,
            })),
          )
        }
      }
    }

    const detail = await getTrackWithPhases(track.id)
    return NextResponse.json({ data: detail ?? toLearningTrack(track) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    await db.delete(learningTracks).where(eq(learningTracks.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
