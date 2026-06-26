import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { db, jobs, jobActions, profiles } from "@/lib/db"
import { toJob, toProfile } from "@/lib/db/mappers"
import { getJobSourcePostedAt } from "@/lib/job-active-time"
import {
  JOB_LIKE_VISITOR_COOKIE,
  resolveJobLikeVisitor,
  setJobLikeVisitorCookie,
} from "@/lib/job-like-visitor"
import { createJobSchema } from "@/lib/job-validation"
import { getSession, requireAuth, requireRole } from "@/lib/utils/auth"

// GET: listar vagas aprovadas (publico) ou vagas do usuario autenticado (?mine=true)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get("mine") === "true"

    if (mine) {
      const user = await requireAuth()
      const rows = await db
        .select({ job: jobs, profile: profiles })
        .from(jobs)
        .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
        .where(eq(jobs.postedBy, user.id))
        .orderBy(desc(jobs.createdAt))

      return NextResponse.json({
        data: rows.map((row) => ({
          ...toJob(row.job),
          profiles: row.profile ? toProfile(row.profile) : null,
        })),
      })
    }

    const rows = await db
      .select({ job: jobs, profile: profiles })
      .from(jobs)
      .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
      .where(eq(jobs.status, "approved"))
      .orderBy(desc(jobs.createdAt))

    // Contagem de curtidas por vaga (action_type = 'liked')
    const likeRows = await db
      .select({ jobId: jobActions.jobId, count: sql<number>`count(*)::int` })
      .from(jobActions)
      .where(eq(jobActions.actionType, "liked"))
      .groupBy(jobActions.jobId)

    const likeCounts = new Map(likeRows.map((r) => [r.jobId, r.count]))

    // Ordena pelas mais curtidas; empate desfeito pela data (mais recente primeiro)
    const data = rows
      .map((row) => ({
        ...toJob(row.job),
        profiles: row.profile ? toProfile(row.profile) : null,
        like_count: likeCounts.get(row.job.id) ?? 0,
      }))
      .sort((a, b) =>
        b.like_count - a.like_count ||
        (b.created_at || "").localeCompare(a.created_at || ""),
      )

    const cookieStore = await cookies()
    const visitor = resolveJobLikeVisitor(
      cookieStore.get(JOB_LIKE_VISITOR_COOKIE)?.value,
    )
    const session = await getSession().catch(() => null)

    let userActions: { job_id: string; action_type: string }[] = []
    if (data.length > 0) {
      const viewerCondition = session
        ? or(
            eq(jobActions.userId, session.id),
            eq(jobActions.visitorHash, visitor.hash),
          )
        : and(
            eq(jobActions.visitorHash, visitor.hash),
            eq(jobActions.actionType, "liked"),
          )

      const actionRows = await db
        .select({ jobId: jobActions.jobId, actionType: jobActions.actionType })
        .from(jobActions)
        .where(viewerCondition)

      userActions = Array.from(
        new Map(
          actionRows.map((row) => [
            `${row.jobId}:${row.actionType}`,
            { job_id: row.jobId, action_type: row.actionType },
          ]),
        ).values(),
      )
    }

    const response = NextResponse.json({
      data,
      user_actions: userActions,
      is_authenticated: !!session,
    })

    return setJobLikeVisitorCookie(response, visitor)
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

    const parsed = createJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (parsed.data.application_url) {
      const existing = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.applicationUrl, parsed.data.application_url))
        .limit(1)

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Esta vaga já foi cadastrada com este link." },
          { status: 409 },
        )
      }
    }

    // HR e admin: vaga auto-aprovada. Mentee: pendente
    const autoApprove = profile.role === "hr" || profile.role === "admin"

    const [data] = await db
      .insert(jobs)
      .values({
        title: parsed.data.title,
        company: parsed.data.company,
        description: parsed.data.description,
        descriptionEn: parsed.data.description_en || null,
        stackTags: parsed.data.stack_tags,
        location: parsed.data.location,
        jobType: parsed.data.job_type,
        level: parsed.data.level,
        category: parsed.data.category,
        salaryRange: parsed.data.salary_range,
        applicationUrl: parsed.data.application_url,
        isInternational: parsed.data.is_international,
        requiredLanguage: parsed.data.required_language,
        languageLevel: parsed.data.language_level,
        sourcePostedAt: getJobSourcePostedAt(parsed.data.active_hours),
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
