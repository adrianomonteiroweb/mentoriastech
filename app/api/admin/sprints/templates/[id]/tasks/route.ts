import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprintTemplates, simTemplateTasks } from "@/lib/db"
import { toSimTemplateTaskApi } from "@/lib/db/sim"
import { simTemplateTaskSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simTemplateTaskSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [template] = await db
      .select({ id: simSprintTemplates.id })
      .from(simSprintTemplates)
      .where(eq(simSprintTemplates.id, id))
      .limit(1)

    if (!template) {
      return NextResponse.json(
        { error: "Template nao encontrado" },
        { status: 404 },
      )
    }

    const [data] = await db
      .insert(simTemplateTasks)
      .values({
        templateId: id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        taskType: parsed.data.task_type,
        points: parsed.data.points,
        initialStatus: parsed.data.initial_status,
        sortOrder: parsed.data.sort_order ?? 0,
        evaluationRules: parsed.data.evaluation_rules ?? null,
      })
      .returning()

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_template_task_created",
      route: `/api/admin/sprints/templates/${id}/tasks`,
      request,
      metadata: { taskId: data.id },
    })

    return NextResponse.json(
      { data: toSimTemplateTaskApi(data) },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
