import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { and, count, eq, or } from "drizzle-orm"
import { z } from "zod"
import { db, jobActions, jobs } from "@/lib/db"
import {
  JOB_LIKE_VISITOR_COOKIE,
  resolveJobLikeVisitor,
  setJobLikeVisitorCookie,
} from "@/lib/job-like-visitor"
import { getSession, requireAuth } from "@/lib/utils/auth"

const actionSchema = z.object({
  action_type: z.enum(["applied", "link_issue", "closed", "liked"]),
})

async function getLikeCount(jobId: string) {
  const [result] = await db
    .select({ value: count() })
    .from(jobActions)
    .where(and(eq(jobActions.jobId, jobId), eq(jobActions.actionType, "liked")))

  return result?.value ?? 0
}

async function getLikeVisitor() {
  const cookieStore = await cookies()
  return resolveJobLikeVisitor(
    cookieStore.get(JOB_LIKE_VISITOR_COOKIE)?.value,
  )
}

function handleRouteError(error: unknown) {
  const status = (error as { status?: number }).status || 500
  const message =
    status >= 500
      ? "Erro interno"
      : (error as Error).message || "Erro interno"

  if (status >= 500) {
    console.error("[job-actions] Error:", error)
  }

  return NextResponse.json({ error: message }, { status })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Tipo de acao invalido" }, { status: 400 })
    }

    if (parsed.data.action_type === "liked") {
      const visitor = await getLikeVisitor()
      const [job] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.status, "approved")))
        .limit(1)

      if (!job) {
        return NextResponse.json(
          { error: "Vaga nao encontrada" },
          { status: 404 },
        )
      }

      const [action] = await db
        .insert(jobActions)
        .values({
          jobId: id,
          userId: null,
          visitorHash: visitor.hash,
          actionType: "liked",
        })
        .onConflictDoNothing()
        .returning()

      const response = NextResponse.json(
        {
          data: action || null,
          deactivated: false,
          like_count: await getLikeCount(id),
        },
        { status: action ? 201 : 200 },
      )

      return setJobLikeVisitorCookie(response, visitor)
    }

    const user = await requireAuth()
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
    return handleRouteError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const actionType = searchParams.get("action_type")

    if (!actionType || !["applied", "link_issue", "closed", "liked"].includes(actionType)) {
      return NextResponse.json({ error: "action_type obrigatorio" }, { status: 400 })
    }

    if (actionType === "liked") {
      const visitor = await getLikeVisitor()
      const session = await getSession().catch(() => null)
      const actorCondition = session
        ? or(
            eq(jobActions.visitorHash, visitor.hash),
            eq(jobActions.userId, session.id),
          )
        : eq(jobActions.visitorHash, visitor.hash)

      await db
        .delete(jobActions)
        .where(
          and(
            eq(jobActions.jobId, id),
            eq(jobActions.actionType, "liked"),
            actorCondition,
          ),
        )

      const response = NextResponse.json({
        success: true,
        like_count: await getLikeCount(id),
      })

      return setJobLikeVisitorCookie(response, visitor)
    }

    const user = await requireAuth()
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
    return handleRouteError(error)
  }
}
