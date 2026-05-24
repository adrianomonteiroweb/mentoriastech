import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db, jobActions, jobs } from "@/lib/db"
import { requireAuth } from "@/lib/utils/auth"

const actionSchema = z.object({
  action_type: z.enum(["applied", "link_issue", "closed"]),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Tipo de acao invalido" }, { status: 400 })
    }

    const [action] = await db
      .insert(jobActions)
      .values({
        jobId: id,
        userId: user.id,
        actionType: parsed.data.action_type,
      })
      .onConflictDoNothing()
      .returning()

    let deactivated = false
    if (action && (parsed.data.action_type === "link_issue" || parsed.data.action_type === "closed")) {
      await db
        .update(jobs)
        .set({ status: "expired", updatedAt: new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.status, "approved")))
      deactivated = true
    }

    return NextResponse.json(
      { data: action || null, deactivated },
      { status: action ? 201 : 200 },
    )
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
    const user = await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const actionType = searchParams.get("action_type")

    if (!actionType || !["applied", "link_issue", "closed"].includes(actionType)) {
      return NextResponse.json({ error: "action_type obrigatorio" }, { status: 400 })
    }

    await db
      .delete(jobActions)
      .where(
        and(
          eq(jobActions.jobId, id),
          eq(jobActions.userId, user.id),
          eq(jobActions.actionType, actionType as "applied" | "link_issue" | "closed"),
        ),
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
