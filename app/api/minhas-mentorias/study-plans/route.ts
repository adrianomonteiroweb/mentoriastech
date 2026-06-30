import { desc, eq } from "drizzle-orm"
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

const createSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  role_type: z.string().trim().min(1, "Informe a posição-alvo."),
  stack: z.enum(["fullstack", "backend", "frontend", "mobile", "data", "devops", "outro"]).optional(),
  seniority: z.enum(["internship", "trainee", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished"]).optional(),
  languages: z.array(z.string().trim().min(1)).max(20).optional(),
  frameworks: z.array(z.string().trim().min(1)).max(20).optional(),
  strengths: z.string().trim().max(4000).optional().or(z.literal("")),
  weaknesses: z.string().trim().max(4000).optional().or(z.literal("")),
  experience: z.string().trim().max(4000).optional().or(z.literal("")),
  minutes_per_day: z.number().int().min(5).max(720),
  linked_opportunity_ids: z.array(z.string().uuid()).max(20).optional(),
})

// GET /api/minhas-mentorias/study-plans
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const rows = await db
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.profileId, profile.id))
      .orderBy(desc(studyPlans.createdAt))

    return NextResponse.json({ data: rows.map(mapStudyPlan) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// POST /api/minhas-mentorias/study-plans
export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const data = parsed.data

    // Vincular oportunidades existentes do mentorado (valida posse via profileId)
    const linkedIds = data.linked_opportunity_ids ?? []
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
    const customPrompt = normalizeStudyPlanPrompt(setting?.value)

    const markdown = await generateStudyPlan({
      roleType: data.role_type,
      stack: data.stack,
      seniority: data.seniority,
      languages: data.languages,
      frameworks: data.frameworks,
      strengths: data.strengths || null,
      weaknesses: data.weaknesses || null,
      experience: data.experience || null,
      minutesPerDay: data.minutes_per_day,
      jobs,
      customPrompt,
    })

    const [row] = await db
      .insert(studyPlans)
      .values({
        profileId: profile.id,
        title: data.title || data.role_type,
        roleType: data.role_type,
        stack: data.stack ?? null,
        seniority: data.seniority ?? null,
        languages: data.languages ?? [],
        frameworks: data.frameworks ?? [],
        strengths: data.strengths || null,
        weaknesses: data.weaknesses || null,
        experience: data.experience || null,
        minutesPerDay: data.minutes_per_day,
        linkedOpportunityIds: linkedIds,
        planMarkdown: markdown,
        progress: buildProgressFromMarkdown(markdown),
        status: "active",
      })
      .returning()

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "study_plan_created",
      route: new URL(request.url).pathname,
      request,
      metadata: { studyPlanId: row.id, minutesPerDay: data.minutes_per_day },
    })

    return NextResponse.json({ data: mapStudyPlan(row) }, { status: 201 })
  } catch (error) {
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
