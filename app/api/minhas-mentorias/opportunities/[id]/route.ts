import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, opportunities } from "@/lib/db"
import { getOpportunityById } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { mapOpportunity } from "../route"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  title: z.string().optional().or(z.literal("")),
  url: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  priority: z.enum(["high", "medium", "low"]).optional(),
  work_model: z.enum(["remote", "hybrid", "onsite"]).optional().nullable(),
  job_level: z.enum(["internship", "junior", "mid", "senior", "trainee"]).optional().nullable(),
  salary_range: z.string().optional().or(z.literal("")),
  contact_name: z.string().optional().or(z.literal("")),
  contact_role: z.string().optional().or(z.literal("")),
  contact_linkedin: z.string().optional().or(z.literal("")),
  interview_type: z.enum(["rh", "technical", "manager"]).optional().nullable(),
  application_date: z.string().datetime().optional().nullable(),
  next_follow_up_at: z.string().datetime().optional().nullable(),
  next_interview_at: z.string().datetime().optional().nullable(),
})

// GET /api/minhas-mentorias/opportunities/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const row = await getOpportunityById(id, profile.id)
    if (!row) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: mapOpportunity(row) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT /api/minhas-mentorias/opportunities/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const existing = await getOpportunityById(id, profile.id)
    if (!existing) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.title !== undefined) updateData.title = data.title || null
    if (data.url !== undefined) updateData.url = data.url || null
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.category !== undefined) updateData.category = data.category || null
    if (data.city !== undefined) updateData.city = data.city || null
    if (data.state !== undefined) updateData.state = data.state || null
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.work_model !== undefined) updateData.workModel = data.work_model
    if (data.job_level !== undefined) updateData.jobLevel = data.job_level
    if (data.salary_range !== undefined) updateData.salaryRange = data.salary_range || null
    if (data.contact_name !== undefined) updateData.contactName = data.contact_name || null
    if (data.contact_role !== undefined) updateData.contactRole = data.contact_role || null
    if (data.contact_linkedin !== undefined) updateData.contactLinkedin = data.contact_linkedin || null
    if (data.interview_type !== undefined) updateData.interviewType = data.interview_type
    if (data.application_date !== undefined) {
      updateData.applicationDate = data.application_date ? new Date(data.application_date) : null
    }
    if (data.next_follow_up_at !== undefined) {
      updateData.nextFollowUpAt = data.next_follow_up_at ? new Date(data.next_follow_up_at) : null
    }
    if (data.next_interview_at !== undefined) {
      updateData.nextInterviewAt = data.next_interview_at ? new Date(data.next_interview_at) : null
    }

    await db
      .update(opportunities)
      .set(updateData)
      .where(
        and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
      )

    const updated = await getOpportunityById(id, profile.id)
    return NextResponse.json({ data: mapOpportunity(updated!) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE /api/minhas-mentorias/opportunities/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const existing = await getOpportunityById(id, profile.id)
    if (!existing) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    await db
      .delete(opportunities)
      .where(
        and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
