import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles, simCompanies, simSprintTasks, simSprints } from "@/lib/db"
import {
  deleteSprintAndCancelApplication,
  getSprintScoreTotal,
  getUnreadCounts,
  toSimSprintApi,
  toSimSprintTaskApi,
} from "@/lib/db/sim"
import { simSprintPatchSchema } from "@/lib/sim/validation"
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
        sprint: simSprints,
        company: simCompanies,
        menteeName: profiles.fullName,
        menteeEmail: profiles.email,
      })
      .from(simSprints)
      .leftJoin(simCompanies, eq(simSprints.companyId, simCompanies.id))
      .innerJoin(profiles, eq(simSprints.profileId, profiles.id))
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const [tasks, totalScore, unread] = await Promise.all([
      db
        .select()
        .from(simSprintTasks)
        .where(eq(simSprintTasks.sprintId, id))
        .orderBy(asc(simSprintTasks.sortOrder), asc(simSprintTasks.taskNumber)),
      getSprintScoreTotal(id),
      getUnreadCounts([id], "mentee"),
    ])

    return NextResponse.json({
      data: {
        ...toSimSprintApi(row.sprint, {
          company: row.company
            ? {
                id: row.company.id,
                name: row.company.name,
                archetype: row.company.archetype,
              }
            : null,
          total_score: totalScore,
          done_count: tasks.filter((t) => t.status === "done").length,
          task_count: tasks.length,
          unread_count: unread.get(id) ?? 0,
        }),
        mentee: {
          id: row.sprint.profileId,
          full_name: row.menteeName,
          email: row.menteeEmail,
        },
        tasks: tasks.map((t) => toSimSprintTaskApi(t, { revealSolution: true })),
        company_docs: row.company
          ? {
              name: row.company.name,
              archetype: row.company.archetype,
              description: row.company.description,
              product_description: row.company.productDescription,
              client_description: row.company.clientDescription,
              service_description: row.company.serviceDescription,
              process_description: row.company.processDescription,
              po_doc_markdown: row.company.poDocMarkdown,
              pm_doc_markdown: row.company.pmDocMarkdown,
              tech_lead_doc_markdown: row.company.techLeadDocMarkdown,
            }
          : null,
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simSprintPatchSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [data] = await db
      .update(simSprints)
      .set({
        status: parsed.data.status,
        endedAt: new Date(),
        finalFeedback: parsed.data.final_feedback || null,
        finalScore: parsed.data.final_score ?? null,
        updatedAt: new Date(),
      })
      .where(eq(simSprints.id, id))
      .returning()

    if (!data) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: data.profileId,
      action: `sim_sprint_${parsed.data.status}`,
      route: `/api/admin/sprints/${id}`,
      request,
    })

    return NextResponse.json({ data: toSimSprintApi(data) })
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

    const [sprint] = await db
      .select()
      .from(simSprints)
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const result = await deleteSprintAndCancelApplication(id)

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: sprint.profileId,
      action: "sim_sprint_inscription_cancelled",
      route: `/api/admin/sprints/${id}`,
      request,
      metadata: { applicationId: result.applicationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
