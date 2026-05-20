import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db, jobs, profiles } from "@/lib/db"
import { toJob, toProfile } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({ job: jobs, profile: profiles })
      .from(jobs)
      .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
      .orderBy(desc(jobs.createdAt))

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toJob(row.job),
        profiles: row.profile ? toProfile(row.profile) : null,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
