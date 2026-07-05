import { desc, eq, inArray, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simCompanies, simSprintTemplates, simTemplateTasks } from "@/lib/db"
import { toSimTemplateApi } from "@/lib/db/sim"
import { simTemplateSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select({
        template: simSprintTemplates,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
      })
      .from(simSprintTemplates)
      .innerJoin(
        simCompanies,
        eq(simSprintTemplates.companyId, simCompanies.id),
      )
      .orderBy(desc(simSprintTemplates.createdAt))

    const templateIds = rows.map((row) => row.template.id)
    const taskCounts = new Map<string, number>()
    if (templateIds.length > 0) {
      const counts = await db
        .select({
          templateId: simTemplateTasks.templateId,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(simTemplateTasks)
        .where(inArray(simTemplateTasks.templateId, templateIds))
        .groupBy(simTemplateTasks.templateId)
      for (const row of counts) taskCounts.set(row.templateId, row.count)
    }

    return NextResponse.json({
      data: rows.map((row) =>
        toSimTemplateApi(row.template, {
          company: {
            id: row.template.companyId,
            name: row.companyName,
            archetype: row.companyArchetype,
          },
          task_count: taskCounts.get(row.template.id) ?? 0,
        }),
      ),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const mentor = await requireMentorAccess()
    const body = await request.json()

    const parsed = simTemplateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [company] = await db
      .select({ id: simCompanies.id })
      .from(simCompanies)
      .where(eq(simCompanies.id, parsed.data.company_id))
      .limit(1)

    if (!company) {
      return NextResponse.json(
        { error: "Empresa nao encontrada" },
        { status: 404 },
      )
    }

    const [data] = await db
      .insert(simSprintTemplates)
      .values({
        companyId: parsed.data.company_id,
        title: parsed.data.title,
        objective: parsed.data.objective || null,
        level: parsed.data.level,
        durationDays: parsed.data.duration_days,
        isActive: parsed.data.is_active ?? true,
        sortOrder: parsed.data.sort_order ?? 0,
        createdBy: mentor.id,
      })
      .returning()

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_created",
      route: "/api/admin/sprints/templates",
      request,
      metadata: { templateId: data.id },
    })

    return NextResponse.json({ data: toSimTemplateApi(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
