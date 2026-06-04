import { createHash, randomUUID } from "node:crypto"
import type { NextResponse } from "next/server"

export const JOB_LIKE_VISITOR_COOKIE = "job_like_visitor_id"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface JobLikeVisitor {
  id: string
  hash: string
  isNew: boolean
}

export function resolveJobLikeVisitor(
  cookieValue?: string | null,
): JobLikeVisitor {
  const hasValidCookie = !!cookieValue && UUID_PATTERN.test(cookieValue)
  const id = hasValidCookie ? cookieValue : randomUUID()

  return {
    id,
    hash: createHash("sha256").update(id).digest("hex"),
    isNew: !hasValidCookie,
  }
}

export function setJobLikeVisitorCookie(
  response: NextResponse,
  visitor: JobLikeVisitor,
) {
  if (visitor.isNew) {
    response.cookies.set(JOB_LIKE_VISITOR_COOKIE, visitor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    })
  }

  return response
}
