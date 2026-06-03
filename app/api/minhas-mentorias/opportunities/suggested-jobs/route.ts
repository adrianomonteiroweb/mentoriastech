import { NextResponse } from "next/server"
import { getSuggestedJobs } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

// GET /api/minhas-mentorias/opportunities/suggested-jobs
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const rows = await getSuggestedJobs(profile.id)
    const data = rows.map((row) => ({
      id: row.job.id,
      title: row.job.title,
      company: row.job.company,
      description: row.job.description,
      location: row.job.location,
      job_type: row.job.jobType,
      level: row.job.level,
      category: row.job.category,
      salary_range: row.job.salaryRange,
      application_url: row.job.applicationUrl,
      created_at: toIso(row.job.createdAt) || "",
      already_tracked: row.alreadyTracked,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
