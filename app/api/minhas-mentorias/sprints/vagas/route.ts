import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simApplications, simCompanies, simSprintTemplates } from "@/lib/db"
import { toSimTemplateApi } from "@/lib/db/sim"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Vagas abertas (templates ativos de empresas ativas) + status da minha candidatura. */
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const rows = await db
      .select({
        template: simSprintTemplates,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
      })
      .from(simSprintTemplates)
      .innerJoin(simCompanies, eq(simSprintTemplates.companyId, simCompanies.id))
      .where(
        and(
          eq(simSprintTemplates.isActive, true),
          eq(simCompanies.isActive, true),
        ),
      )
      .orderBy(asc(simSprintTemplates.sortOrder), desc(simSprintTemplates.createdAt))

    const templateIds = rows.map((row) => row.template.id)
    const myApplications = new Map<string, string>()
    if (templateIds.length > 0) {
      const applications = await db
        .select({
          templateId: simApplications.templateId,
          status: simApplications.status,
          createdAt: simApplications.createdAt,
        })
        .from(simApplications)
        .where(
          and(
            eq(simApplications.profileId, profile.id),
            inArray(simApplications.templateId, templateIds),
          ),
        )
        .orderBy(asc(simApplications.createdAt))
      // Última candidatura por template prevalece
      for (const application of applications) {
        myApplications.set(application.templateId, application.status)
      }
    }

    return NextResponse.json({
      data: rows.map((row) =>
        toSimTemplateApi(row.template, {
          company: {
            id: row.template.companyId,
            name: row.companyName,
            archetype: row.companyArchetype,
          },
          my_application_status:
            (myApplications.get(row.template.id) as
              | "pending"
              | "approved"
              | "rejected"
              | "cancelled"
              | undefined) ?? null,
        }),
      ),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
