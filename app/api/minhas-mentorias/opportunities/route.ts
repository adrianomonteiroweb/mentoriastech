import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { companies, db, opportunities } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { findOrCreateCompany, getOpportunitiesByProfileId } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

const DEFAULT_CHECKLIST = [
  { id: "item-0", label: "Entendi o que a empresa faz?", checked: false },
  { id: "item-1", label: "Tenho aderencia minima?", checked: false },
  { id: "item-2", label: "A vaga faz sentido pro meu momento?", checked: false },
  { id: "item-3", label: "Existe recrutador para contato?", checked: false },
]

const createSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa e obrigatorio"),
  company_linkedin_url: z.string().min(1, "LinkedIn da empresa e obrigatorio"),
  title: z.string().optional().or(z.literal("")),
  url: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  work_model: z.enum(["remote", "hybrid", "onsite"]).optional(),
  job_level: z.enum(["internship", "junior", "mid", "senior", "trainee"]).optional(),
  salary_range: z.string().optional().or(z.literal("")),
  contact_name: z.string().optional().or(z.literal("")),
  contact_role: z.string().optional().or(z.literal("")),
  contact_linkedin: z.string().optional().or(z.literal("")),
})

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function mapOpportunity(row: {
  opportunity: typeof opportunities.$inferSelect
  companyName: string
  companyLinkedinUrl: string | null
}) {
  const o = row.opportunity
  return {
    id: o.id,
    profile_id: o.profileId,
    company_id: o.companyId,
    company_name: row.companyName,
    company_linkedin_url: row.companyLinkedinUrl,
    title: o.title,
    url: o.url,
    description: o.description,
    category: o.category,
    city: o.city,
    state: o.state,
    status: o.status,
    finalization_type: o.finalizationType,
    priority: o.priority,
    work_model: o.workModel,
    job_level: o.jobLevel,
    salary_range: o.salaryRange,
    contact_name: o.contactName,
    contact_role: o.contactRole,
    contact_linkedin: o.contactLinkedin,
    interview_type: o.interviewType,
    resume_id: o.resumeId,
    checklist: o.checklist,
    application_date: toIso(o.applicationDate),
    next_follow_up_at: toIso(o.nextFollowUpAt),
    next_interview_at: toIso(o.nextInterviewAt),
    created_at: toIso(o.createdAt) || "",
    updated_at: toIso(o.updatedAt) || "",
  }
}

export { mapOpportunity }

// GET /api/minhas-mentorias/opportunities
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const rows = await getOpportunitiesByProfileId(profile.id)
    const data = rows.map(mapOpportunity)

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// POST /api/minhas-mentorias/opportunities
export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const data = parsed.data

    // Buscar ou criar empresa
    const company = await findOrCreateCompany(
      profile.id,
      data.company_name,
      data.company_linkedin_url,
    )

    // Criar oportunidade na etapa "Avaliar" com checklist default
    const [opp] = await db
      .insert(opportunities)
      .values({
        profileId: profile.id,
        companyId: company.id,
        title: data.title || null,
        url: data.url || null,
        description: data.description || null,
        category: data.category || null,
        city: data.city || null,
        state: data.state || null,
        status: "evaluating",
        priority: "medium",
        workModel: data.work_model || null,
        jobLevel: data.job_level || null,
        salaryRange: data.salary_range || null,
        contactName: data.contact_name || null,
        contactRole: data.contact_role || null,
        contactLinkedin: data.contact_linkedin || null,
        checklist: DEFAULT_CHECKLIST,
      })
      .returning()

    const result = mapOpportunity({
      opportunity: opp,
      companyName: company.name,
      companyLinkedinUrl: company.linkedinUrl,
    })

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "minhas_mentorias_opportunity_created",
      route: new URL(request.url).pathname,
      request,
      metadata: { opportunityId: opp.id, companyId: company.id },
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
