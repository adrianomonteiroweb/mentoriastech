import { createHash } from "crypto"
import { and, eq, gt } from "drizzle-orm"
import { db, pageEvents } from "@/lib/db"

const WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

export class ToolRateLimitError extends Error {
  status: number
  constructor(message: string, status = 429) {
    super(message)
    this.name = "ToolRateLimitError"
    this.status = status
  }
}

/**
 * Hash do IP do visitante (mesma abordagem de app/api/track/page/route.ts).
 */
export function getVisitorHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return `ip:${createHash("sha256").update(ip).digest("hex").substring(0, 16)}`
}

/**
 * Rate-limit por IP reusando page_events (sem migração). Conta os usos da
 * ferramenta na janela e registra o uso atual. Lança ToolRateLimitError (429)
 * quando o limite é atingido.
 */
export async function enforceToolRateLimit(
  request: Request,
  target: string,
  max: number,
): Promise<void> {
  const visitorHash = getVisitorHash(request)
  const cutoff = new Date(Date.now() - WINDOW_MS)

  const recent = await db
    .select({ id: pageEvents.id })
    .from(pageEvents)
    .where(
      and(
        eq(pageEvents.visitorHash, visitorHash),
        eq(pageEvents.eventType, "tool_use"),
        eq(pageEvents.target, target),
        gt(pageEvents.createdAt, cutoff),
      ),
    )
    .limit(max)

  if (recent.length >= max) {
    throw new ToolRateLimitError(
      "Você atingiu o limite diário desta ferramenta gratuita. Tente novamente amanhã ou entre em contato.",
    )
  }

  await db.insert(pageEvents).values({
    path: "/ferramentas/curriculo",
    eventType: "tool_use",
    target,
    visitorHash,
  })
}
