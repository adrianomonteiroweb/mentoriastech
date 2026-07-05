import { desc, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles, simCompanies, simSprints } from "@/lib/db"
import {
  getActionableUnreadCounts,
  getLastActivityAt,
  getScoreTotals,
  getTaskCounts,
  getUnreadCounts,
  toSimSprintApi,
} from "@/lib/db/sim"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select({
        sprint: simSprints,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
        menteeName: profiles.fullName,
        menteeEmail: profiles.email,
      })
      .from(simSprints)
      .leftJoin(simCompanies, eq(simSprints.companyId, simCompanies.id))
      .innerJoin(profiles, eq(simSprints.profileId, profiles.id))
      .orderBy(
        sql`case when ${simSprints.status} = 'active' then 0 else 1 end`,
        desc(simSprints.startedAt),
      )

    const sprintIds = rows.map((row) => row.sprint.id)
    const [scores, taskCounts, unread, lastActivity] = await Promise.all([
      getScoreTotals(sprintIds),
      getTaskCounts(sprintIds),
      getUnreadCounts(sprintIds, "mentee"),
      getLastActivityAt(sprintIds),
    ])
    const actionable = await getActionableUnreadCounts(sprintIds, "mentee").catch(() => new Map<string, number>())

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toSimSprintApi(row.sprint, {
          company: row.sprint.companyId
            ? {
                id: row.sprint.companyId,
                name: row.companyName || "",
                archetype: row.companyArchetype || "startup",
              }
            : null,
          total_score: scores.get(row.sprint.id) ?? 0,
          done_count: taskCounts.get(row.sprint.id)?.done ?? 0,
          task_count: taskCounts.get(row.sprint.id)?.total ?? 0,
          unread_count: unread.get(row.sprint.id) ?? 0,
          doubt_count: actionable.get(row.sprint.id) ?? 0,
        }),
        mentee: {
          id: row.sprint.profileId,
          full_name: row.menteeName,
          email: row.menteeEmail,
        },
        last_activity_at: lastActivity.get(row.sprint.id) ?? null,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
