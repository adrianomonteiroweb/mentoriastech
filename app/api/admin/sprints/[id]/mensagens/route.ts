import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simDailyMessages, simScoreEvents, simSprintTasks, simSprints } from "@/lib/db"
import {
  getSprintMessagesApi,
  markMessagesRead,
  toSimDailyMessageApi,
} from "@/lib/db/sim"
import { getSprintDay } from "@/lib/sim/sprint-day"
import { simMentorMessageSchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const [sprint] = await db
      .select({ id: simSprints.id })
      .from(simSprints)
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const url = new URL(request.url)
    if (url.searchParams.get("mark_read") === "1") {
      await markMessagesRead(id, "mentee")
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
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simMentorMessageSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

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

    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    let taskNumber: number | null = null
    if (parsed.data.task_id) {
      const [task] = await db
        .select({ taskNumber: simSprintTasks.taskNumber })
        .from(simSprintTasks)
        .where(eq(simSprintTasks.id, parsed.data.task_id))
        .limit(1)
      if (!task) {
        return NextResponse.json(
          { error: "Task referenciada nao encontrada" },
          { status: 404 },
        )
      }
      taskNumber = task.taskNumber
    }

    const sprintDay = getSprintDay(sprint.startedAt, sprint.durationDays)

    const [message] = await db
      .insert(simDailyMessages)
      .values({
        sprintId: id,
        authorRole: "mentor",
        authorId: mentor.id,
        kind: parsed.data.kind,
        body: parsed.data.body,
        taskId: parsed.data.task_id || null,
        sprintDay,
      })
      .returning()

    let scoreEvent = null
    if (parsed.data.adjustment) {
      const [event] = await db
        .insert(simScoreEvents)
        .values({
          sprintId: id,
          taskId: parsed.data.task_id || null,
          messageId: message.id,
          source: "manual",
          category: parsed.data.adjustment.category,
          delta: parsed.data.adjustment.delta,
          reason: parsed.data.adjustment.reason,
          sprintDay,
          createdBy: mentor.id,
        })
        .returning()
      scoreEvent = {
        id: event.id,
        delta: event.delta,
        reason: event.reason,
        category: event.category,
      }
    }

    await logAuditEvent({
      actorId: mentor.id,
      targetUserId: sprint.profileId,
      action: parsed.data.adjustment
        ? "sim_mentor_message_with_adjustment"
        : "sim_mentor_message",
      route: `/api/admin/sprints/${id}/mensagens`,
      request,
    })

    return NextResponse.json(
      {
        data: toSimDailyMessageApi(message, {
          author_name: mentor.full_name,
          task_number: taskNumber,
          score_event: scoreEvent,
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
