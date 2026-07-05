import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
  db,
  simApplications,
  simSprintTemplates,
  simTemplateTasks,
} from "@/lib/db"
import {
  createSprintFromApplication,
  getActiveSprintForProfile,
  toSimApplicationApi,
} from "@/lib/db/sim"
import { simApplicationReviewSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simApplicationReviewSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [application] = await db
      .select()
      .from(simApplications)
      .where(eq(simApplications.id, id))
      .limit(1)

    if (!application) {
      return NextResponse.json(
        { error: "Candidatura nao encontrada" },
        { status: 404 },
      )
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Candidatura ja foi analisada" },
        { status: 409 },
      )
    }

    if (parsed.data.status === "rejected") {
      const [data] = await db
        .update(simApplications)
        .set({
          status: "rejected",
          reviewedBy: mentor.id,
          reviewedAt: new Date(),
          reviewNote: parsed.data.review_note || null,
          updatedAt: new Date(),
        })
        .where(eq(simApplications.id, id))
        .returning()

      await logAuditEvent({
        actorId: mentor.id,
        targetUserId: application.profileId,
        action: "sim_application_rejected",
        route: `/api/admin/sprints/applications/${id}`,
        request,
      })

      return NextResponse.json({ data: toSimApplicationApi(data) })
    }

    // Aprovação: instancia a sprint a partir do template (snapshot)
    const activeSprint = await getActiveSprintForProfile(application.profileId)
    if (activeSprint) {
      return NextResponse.json(
        { error: "Mentorado ja possui uma sprint em andamento" },
        { status: 409 },
      )
    }

    const [template] = await db
      .select()
      .from(simSprintTemplates)
      .where(eq(simSprintTemplates.id, application.templateId))
      .limit(1)

    if (!template) {
      return NextResponse.json(
        { error: "Template da vaga nao existe mais" },
        { status: 404 },
      )
    }

    const templateTasks = await db
      .select()
      .from(simTemplateTasks)
      .where(eq(simTemplateTasks.templateId, template.id))
      .orderBy(asc(simTemplateTasks.sortOrder), asc(simTemplateTasks.createdAt))

    if (templateTasks.length === 0) {
      return NextResponse.json(
        { error: "Template sem tasks — cadastre as tasks antes de aprovar" },
        { status: 409 },
      )
    }

    const sprintId = await createSprintFromApplication({
      application,
      template,
      templateTasks,
      mentorId: mentor.id,
    })

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: application.profileId,
      action: "sim_application_approved",
      route: `/api/admin/sprints/applications/${id}`,
      request,
      metadata: { sprintId },
    })

    const [updated] = await db
      .select()
      .from(simApplications)
      .where(eq(simApplications.id, id))
      .limit(1)

    return NextResponse.json({
      data: toSimApplicationApi(updated),
      sprint_id: sprintId,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
