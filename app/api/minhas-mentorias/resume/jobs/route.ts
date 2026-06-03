import { NextResponse } from "next/server"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { createJobSchema } from "@/lib/job-validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const body = await request.json()

    const parsed = createJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [data] = await db
      .insert(jobs)
      .values({
        title: parsed.data.title,
        company: parsed.data.company,
        description: parsed.data.description,
        location: parsed.data.location,
        jobType: parsed.data.job_type,
        level: parsed.data.level,
        category: parsed.data.category,
        salaryRange: parsed.data.salary_range,
        applicationUrl: parsed.data.application_url,
        isInternational: parsed.data.is_international,
        requiredLanguage: parsed.data.required_language,
        languageLevel: parsed.data.language_level,
        postedBy: profile.id,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      })
      .returning()

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "minhas_mentorias_resume_job_created",
      route: new URL(request.url).pathname,
      request,
      metadata: { jobId: data.id, descriptionLength: parsed.data.description.length },
    })

    return NextResponse.json({ data: toJob(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
