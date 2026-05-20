import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db, jobs, profiles } from "@/lib/db"
import { toJob, toProfile } from "@/lib/db/mappers"
import { requireAuth, requireRole } from "@/lib/utils/auth"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(3),
  company: z.string().min(2),
  description: z.string().min(10),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  level: z.enum(["internship", "junior", "mid", "senior"]).default("junior"),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional(),
})

// GET: listar vagas aprovadas (publico)
export async function GET() {
  try {
    const rows = await db
      .select({ job: jobs, profile: profiles })
      .from(jobs)
      .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
      .where(eq(jobs.status, "approved"))
      .orderBy(desc(jobs.createdAt))

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toJob(row.job),
        profiles: row.profile ? toProfile(row.profile) : null,
      })),
    })
  } catch (error) {
    console.error("[jobs] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar vagas" }, { status: 500 })
  }
}

// POST: criar vaga (autenticado)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const profile = await requireRole("admin", "hr", "mentee")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // HR e admin: vaga auto-aprovada. Mentee: pendente
    const autoApprove = profile.role === "hr" || profile.role === "admin"

    const [data] = await db
      .insert(jobs)
      .values({
        title: parsed.data.title,
        company: parsed.data.company,
        description: parsed.data.description,
        location: parsed.data.location,
        jobType: parsed.data.job_type,
        level: parsed.data.level,
        salaryRange: parsed.data.salary_range,
        applicationUrl: parsed.data.application_url,
        postedBy: user.id,
        status: autoApprove ? "approved" : "pending",
        approvedBy: autoApprove ? user.id : null,
        approvedAt: autoApprove ? new Date() : null,
      })
      .returning()

    return NextResponse.json({ data: toJob(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
