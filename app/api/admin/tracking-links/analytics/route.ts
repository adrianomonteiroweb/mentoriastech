import { NextResponse } from "next/server"
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm"
import { db, pageEvents } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"

function periodToSince(period: string): Date {
  const now = Date.now()
  const match = period.match(/^(\d+)([hd])$/)
  if (match) {
    const value = Math.min(Number(match[1]), match[2] === "d" ? 365 : 8760)
    const ms = match[2] === "h" ? value * 3600_000 : value * 86400_000
    return new Date(now - ms)
  }
  return new Date(now - 3600_000)
}

export async function GET(request: Request) {
  try {
    await requireRole("admin")

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "1h"
    const since = periodToSince(period)

    const bySource = await db
      .select({
        utmSource: pageEvents.utmSource,
        utmMedium: pageEvents.utmMedium,
        utmCampaign: pageEvents.utmCampaign,
        path: pageEvents.path,
        totalViews: count(),
        uniqueVisitors: countDistinct(pageEvents.visitorHash),
      })
      .from(pageEvents)
      .where(
        and(
          gte(pageEvents.createdAt, since),
          eq(pageEvents.eventType, "visit"),
          isNotNull(pageEvents.utmSource),
        ),
      )
      .groupBy(pageEvents.utmSource, pageEvents.utmMedium, pageEvents.utmCampaign, pageEvents.path)
      .orderBy(desc(count()))

    const organicGoogle = await db
      .select({
        path: pageEvents.path,
        totalViews: count(),
        uniqueVisitors: countDistinct(pageEvents.visitorHash),
      })
      .from(pageEvents)
      .where(
        and(
          gte(pageEvents.createdAt, since),
          eq(pageEvents.eventType, "visit"),
          sql`${pageEvents.referrer} ILIKE '%google.%'`,
          sql`${pageEvents.utmSource} IS NULL`,
        ),
      )
      .groupBy(pageEvents.path)
      .orderBy(desc(count()))

    const directTraffic = await db
      .select({
        path: pageEvents.path,
        totalViews: count(),
        uniqueVisitors: countDistinct(pageEvents.visitorHash),
      })
      .from(pageEvents)
      .where(
        and(
          gte(pageEvents.createdAt, since),
          eq(pageEvents.eventType, "visit"),
          sql`(${pageEvents.referrer} IS NULL OR ${pageEvents.referrer} = '')`,
          sql`${pageEvents.utmSource} IS NULL`,
        ),
      )
      .groupBy(pageEvents.path)
      .orderBy(desc(count()))

    const sectionExpr = sql<string>`CASE
      WHEN ${pageEvents.path} = '/' THEN '/'
      WHEN ${pageEvents.path} LIKE '/jobs%' THEN '/jobs'
      WHEN ${pageEvents.path} LIKE '/content%' THEN '/content'
      WHEN ${pageEvents.path} LIKE '/ferramentas%' THEN '/ferramentas'
      ELSE 'other'
    END`

    const keyPages = await db
      .select({
        section: sectionExpr,
        totalViews: count(),
        uniqueVisitors: countDistinct(pageEvents.visitorHash),
      })
      .from(pageEvents)
      .where(
        and(
          gte(pageEvents.createdAt, since),
          inArray(pageEvents.eventType, ["visit", "tool_view"]),
        ),
      )
      .groupBy(sectionExpr)
      .orderBy(desc(count()))

    return NextResponse.json({
      data: {
        bySource,
        organicGoogle,
        directTraffic,
        keyPages,
        period: { value: period, since: since.toISOString() },
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tracking-links/analytics] GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar analytics" }, { status: 500 })
  }
}
