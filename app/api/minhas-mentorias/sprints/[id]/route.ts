import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simCompanies, simSprintTasks } from "@/lib/db"
import {
  getSprintOwnedByProfile,
  getSprintScoreTotal,
  getUnreadCounts,
  toSimSprintApi,
  toSimSprintTaskApi,
} from "@/lib/db/sim"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Payload do hub da sprint: sprint + tasks + docs da empresa + pontos + não-lidas. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const sprint = await getSprintOwnedByProfile(id, profile.id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const [tasks, totalScore, unread, company] = await Promise.all([
      db
        .select()
        .from(simSprintTasks)
        .where(eq(simSprintTasks.sprintId, id))
        .orderBy(asc(simSprintTasks.sortOrder), asc(simSprintTasks.taskNumber)),
      getSprintScoreTotal(id),
      getUnreadCounts([id], "mentor"),
      sprint.companyId
        ? db
            .select()
            .from(simCompanies)
            .where(eq(simCompanies.id, sprint.companyId))
            .limit(1)
            .then((rows) => rows[0] || null)
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      data: {
        ...toSimSprintApi(sprint, {
          company: company
            ? {
                id: company.id,
                name: company.name,
                archetype: company.archetype,
              }
            : null,
          total_score: totalScore,
          done_count: tasks.filter((t) => t.status === "done").length,
          task_count: tasks.length,
          unread_count: unread.get(id) ?? 0,
        }),
        tasks: tasks.map(toSimSprintTaskApi),
        company_docs: company
          ? {
              name: company.name,
              archetype: company.archetype,
              description: company.description,
              product_description: company.productDescription,
              client_description: company.clientDescription,
              service_description: company.serviceDescription,
              process_description: company.processDescription,
              po_doc_markdown: company.poDocMarkdown,
              pm_doc_markdown: company.pmDocMarkdown,
              tech_lead_doc_markdown: company.techLeadDocMarkdown,
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
