import { NextResponse } from "next/server"
import { desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { db, jobs, jobActions, profiles } from "@/lib/db"
import { toJob, toProfile } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

const bulkDeleteSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "expired"]),
})

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({ job: jobs, profile: profiles })
      .from(jobs)
      .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
      .orderBy(desc(jobs.createdAt))

    const data = rows.map((row) => ({
      ...toJob(row.job),
      profiles: row.profile ? toProfile(row.profile) : null,
    }))

    const jobIds = data.map((j) => j.id)
    let actionCounts: Record<string, { applied: number; link_issue: number; closed: number; liked: number }> = {}

    if (jobIds.length > 0) {
      const counts = await db
        .select({
          jobId: jobActions.jobId,
          actionType: jobActions.actionType,
          count: sql<number>`count(*)::int`,
        })
        .from(jobActions)
        .groupBy(jobActions.jobId, jobActions.actionType)

      for (const row of counts) {
        if (!actionCounts[row.jobId]) {
          actionCounts[row.jobId] = { applied: 0, link_issue: 0, closed: 0, liked: 0 }
        }
        const key = row.actionType as keyof typeof actionCounts[string]
        actionCounts[row.jobId][key] = row.count
      }
    }

    return NextResponse.json({
      data: data.map((job) => ({
        ...job,
        action_counts: actionCounts[job.id] || { applied: 0, link_issue: 0, closed: 0, liked: 0 },
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = bulkDeleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const deleted = await db
      .delete(jobs)
      .where(eq(jobs.status, parsed.data.status))
      .returning({ id: jobs.id })

    return NextResponse.json({ success: true, deleted: deleted.length })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
