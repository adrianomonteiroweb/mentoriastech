import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simDailyMessages, simSprintTasks } from "@/lib/db"
import {
  getSprintMessagesApi,
  getSprintOwnedByProfile,
  markMessagesRead,
  toSimDailyMessageApi,
} from "@/lib/db/sim"
import { getSprintDay } from "@/lib/sim/sprint-day"
import { awardDailyStandup, awardImpediment } from "@/lib/sim/agile-scoring"
import { simMessageSchema } from "@/lib/sim/validation"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
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

    const url = new URL(request.url)
    if (url.searchParams.get("mark_read") === "1") {
      await markMessagesRead(id, "mentor")
    }

    const data = await getSprintMessagesApi(id)
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params
    const body = await request.json()

    const parsed = simMessageSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const sprint = await getSprintOwnedByProfile(id, profile.id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    let taskNumber: number | null = null
    if (parsed.data.task_id) {
      const [task] = await db
        .select({
          taskNumber: simSprintTasks.taskNumber,
          sprintId: simSprintTasks.sprintId,
        })
        .from(simSprintTasks)
        .where(eq(simSprintTasks.id, parsed.data.task_id))
        .limit(1)
      if (!task || task.sprintId !== id) {
        return NextResponse.json(
          { error: "Task referenciada nao encontrada" },
          { status: 404 },
        )
      }
      taskNumber = task.taskNumber
    }

    const [message] = await db
      .insert(simDailyMessages)
      .values({
        sprintId: id,
        authorRole: "mentee",
        authorId: profile.id,
        kind: parsed.data.kind,
        body: parsed.data.body,
        taskId: parsed.data.task_id || null,
        sprintDay: getSprintDay(sprint.startedAt, sprint.durationDays),
      })
      .returning()

    // Pontuação de metodologia ágil (idempotente por dia): fez a daily / sinalizou impedimento.
    if (parsed.data.kind === "daily") {
      await awardDailyStandup(sprint)
    } else if (parsed.data.kind === "impediment") {
      await awardImpediment(sprint)
    }

    return NextResponse.json(
      {
        data: toSimDailyMessageApi(message, {
          author_name: profile.fullName,
          task_number: taskNumber,
        }),
      },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
