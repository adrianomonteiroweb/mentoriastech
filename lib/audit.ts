import { db, auditLogs } from "@/lib/db"

interface AuditEventInput {
  actorId?: string | null
  targetUserId?: string | null
  action: string
  route?: string | null
  request?: Request
  metadata?: Record<string, unknown>
}

function getRequestIp(request: Request | undefined) {
  if (!request) return null
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return request.headers.get("x-real-ip")
}

export async function logAuditEvent({
  actorId,
  targetUserId,
  action,
  route,
  request,
  metadata,
}: AuditEventInput) {
  try {
    await db.insert(auditLogs).values({
      actorId: actorId || null,
      targetUserId: targetUserId || null,
      action,
      route: route || null,
      ipAddress: getRequestIp(request),
      userAgent: request?.headers.get("user-agent") || null,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error)
  }
}
