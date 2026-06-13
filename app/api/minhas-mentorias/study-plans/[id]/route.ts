import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, siteSettings, studyPlans } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { generateStudyPlan, ResumeAIError } from "@/lib/ai/gemini"
import {
  STUDY_PLAN_AI_PROMPT_SETTING_KEY,
  normalizeStudyPlanPrompt,
} from "@/lib/study-plan-ai-prompt"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { getOpportunitiesByProfileId } from "@/lib/db/mentee-opportunities"
import { mapStudyPlan, buildProgressFromMarkdown } from "@/lib/db/study-plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const progressItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
})

const updateSchema = z.object({
  progress: z.array(progressItemSchema).max(200).optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  regenerate: z.boolean().optional(),
})

async function loadOwned(id: string, profileId: string) {
  const [row] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, id), eq(studyPlans.profileId, profileId)))
    .limit(1)
  return row
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const row = await loadOwned(id, profile.id)
    if (!row) {
      return NextResponse.json({ error: "Plano de estudos não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ data: mapStudyPlan(row) })
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
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const existing = await loadOwned(id, profile.id)
    if (!existing) {
      return NextResponse.json({ error: "Plano de estudos não encontrado" }, { status: 404 })
    }

    const updateData: Partial<typeof studyPlans.$inferInsert> = { updatedAt: new Date() }

    if (parsed.data.regenerate) {
      // Regenera o plano reaproveitando os dados salvos
      const linkedIds = existing.linkedOpportunityIds ?? []
      let jobs: { title?: string | null; company?: string | null; description?: string | null }[] = []
      if (linkedIds.length > 0) {
        const all = await getOpportunitiesByProfileId(profile.id)
        jobs = all
          .filter((row) => linkedIds.includes(row.opportunity.id))
          .map((row) => ({
            title: row.opportunity.title,
            company: row.companyName,
            description: row.opportunity.description,
          }))
      }

      const [setting] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, STUDY_PLAN_AI_PROMPT_SETTING_KEY))
        .limit(1)

      const markdown = await generateStudyPlan({
        roleType: existing.roleType || "",
        stack: existing.stack,
        seniority: existing.seniority,
        languages: existing.languages ?? [],
        frameworks: existing.frameworks ?? [],
        strengths: existing.strengths,
        weaknesses: existing.weaknesses,
        experience: existing.experience,
        minutesPerDay: existing.minutesPerDay,
        jobs,
        customPrompt: normalizeStudyPlanPrompt(setting?.value),
      })

      updateData.planMarkdown = markdown
      updateData.progress = buildProgressFromMarkdown(markdown)
    }

    if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status

    const [row] = await db
      .update(studyPlans)
      .set(updateData)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.profileId, profile.id)))
      .returning()

    return NextResponse.json({ data: mapStudyPlan(row) })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
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
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const [deleted] = await db
      .delete(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.profileId, profile.id)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Plano de estudos não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
