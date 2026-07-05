import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simCompanies, simSprintTemplates, simTemplateTasks } from "@/lib/db"
import { toSimTemplateApi, toSimTemplateTaskApi } from "@/lib/db/sim"
import { simTemplateSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const [row] = await db
      .select({
        template: simSprintTemplates,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
      })
      .from(simSprintTemplates)
      .innerJoin(simCompanies, eq(simSprintTemplates.companyId, simCompanies.id))
      .where(eq(simSprintTemplates.id, id))
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { error: "Template nao encontrado" },
        { status: 404 },
      )
    }

    const tasks = await db
      .select()
      .from(simTemplateTasks)
      .where(eq(simTemplateTasks.templateId, id))
      .orderBy(asc(simTemplateTasks.sortOrder), asc(simTemplateTasks.createdAt))

    return NextResponse.json({
      data: toSimTemplateApi(row.template, {
        company: {
          id: row.template.companyId,
          name: row.companyName,
          archetype: row.companyArchetype,
        },
        tasks: tasks.map(toSimTemplateTaskApi),
      }),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simTemplateSchema.partial().safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const updateData: Partial<typeof simSprintTemplates.$inferInsert> = {
      updatedAt: new Date(),
    }
    const d = parsed.data
    if (d.company_id !== undefined) updateData.companyId = d.company_id
    if (d.title !== undefined) updateData.title = d.title
    if (d.objective !== undefined) updateData.objective = d.objective || null
    if (d.level !== undefined) updateData.level = d.level
    if (d.duration_days !== undefined) updateData.durationDays = d.duration_days
    if (d.is_active !== undefined) updateData.isActive = d.is_active
    if (d.sort_order !== undefined) updateData.sortOrder = d.sort_order

    const [data] = await db
      .update(simSprintTemplates)
      .set(updateData)
      .where(eq(simSprintTemplates.id, id))
      .returning()

    if (!data) {
      return NextResponse.json(
        { error: "Template nao encontrado" },
        { status: 404 },
      )
    }

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_updated",
      route: `/api/admin/sprints/templates/${id}`,
      request,
    })

    return NextResponse.json({ data: toSimTemplateApi(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params

    await db.delete(simSprintTemplates).where(eq(simSprintTemplates.id, id))

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_deleted",
      route: `/api/admin/sprints/templates/${id}`,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
