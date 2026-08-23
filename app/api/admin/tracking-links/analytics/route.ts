import { NextResponse } from "next/server"
import { and, count, countDistinct, desc, eq, gte, isNotNull, sql } from "drizzle-orm"
import { db, pageEvents } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"

export async function GET(request: Request) {
  try {
    await requireRole("admin")

    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get("days")) || 30, 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

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

    return NextResponse.json({
      data: {
        bySource,
        organicGoogle,
        directTraffic,
        period: { days, since: since.toISOString() },
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
