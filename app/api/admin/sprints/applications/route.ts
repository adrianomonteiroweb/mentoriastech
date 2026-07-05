import { desc, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
  db,
  profiles,
  simApplications,
  simCompanies,
  simSprintTemplates,
} from "@/lib/db"
import { toSimApplicationApi } from "@/lib/db/sim"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select({
        application: simApplications,
        template: simSprintTemplates,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
        menteeName: profiles.fullName,
        menteeEmail: profiles.email,
      })
      .from(simApplications)
      .innerJoin(
        simSprintTemplates,
        eq(simApplications.templateId, simSprintTemplates.id),
      )
      .innerJoin(
        simCompanies,
        eq(simSprintTemplates.companyId, simCompanies.id),
      )
      .innerJoin(profiles, eq(simApplications.profileId, profiles.id))
      .orderBy(
        sql`case when ${simApplications.status} = 'pending' then 0 else 1 end`,
        desc(simApplications.createdAt),
      )

    return NextResponse.json({
      data: rows.map((row) =>
        toSimApplicationApi(row.application, {
          template: {
            id: row.template.id,
            title: row.template.title,
            level: row.template.level,
            duration_days: row.template.durationDays,
          },
          company: {
            id: row.template.companyId,
            name: row.companyName,
            archetype: row.companyArchetype,
          },
          mentee: {
            id: row.application.profileId,
            full_name: row.menteeName,
            email: row.menteeEmail,
          },
        }),
      ),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
