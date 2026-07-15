import { NextResponse } from "next/server"
import { and, eq, gte, sql, sum } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, ads, adDailyStats } from "@/lib/db"

interface PeriodStats {
  views: number
  clicks: number
  conversion: number
}

interface AdPeriodStats {
  ad_id: string
  title: string
  is_active: boolean
  today: PeriodStats
  week: PeriodStats
  month: PeriodStats
  year: PeriodStats
  total: PeriodStats
}

function rate(clicks: number, views: number): number {
  if (views <= 0) return 0
  return Math.round((clicks / views) * 1000) / 10
}

export async function GET() {
  const authError = await requireRole("admin")
  if (authError) return authError

  const allAds = await db
    .select({ id: ads.id, title: ads.title, isActive: ads.isActive, viewCount: ads.viewCount, clickCount: ads.clickCount })
    .from(ads)
    .orderBy(ads.sortOrder, ads.createdAt)

  const periods = ["today", "week", "month", "year"] as const
  const dateFilters = {
    today: sql`CURRENT_DATE`,
    week: sql`date_trunc('week', CURRENT_DATE)`,
    month: sql`date_trunc('month', CURRENT_DATE)`,
    year: sql`date_trunc('year', CURRENT_DATE)`,
  }

  const periodQueries = periods.map((period) =>
    db
      .select({
        adId: adDailyStats.adId,
        views: sum(adDailyStats.viewCount).mapWith(Number),
        clicks: sum(adDailyStats.clickCount).mapWith(Number),
      })
      .from(adDailyStats)
      .where(gte(adDailyStats.statDate, dateFilters[period]))
      .groupBy(adDailyStats.adId),
  )

  const [todayRows, weekRows, monthRows, yearRows] = await Promise.all(periodQueries)

  function toMap(rows: { adId: string; views: number; clicks: number }[]) {
    const m = new Map<string, { views: number; clicks: number }>()
    for (const r of rows) m.set(r.adId, { views: r.views || 0, clicks: r.clicks || 0 })
    return m
  }

  const maps = {
    today: toMap(todayRows),
    week: toMap(weekRows),
    month: toMap(monthRows),
    year: toMap(yearRows),
  }

  const totals = { today: { views: 0, clicks: 0 }, week: { views: 0, clicks: 0 }, month: { views: 0, clicks: 0 }, year: { views: 0, clicks: 0 }, total: { views: 0, clicks: 0 } }

  const result: AdPeriodStats[] = allAds.map((ad) => {
    const entry: AdPeriodStats = {
      ad_id: ad.id,
      title: ad.title,
      is_active: ad.isActive,
      today: { views: 0, clicks: 0, conversion: 0 },
      week: { views: 0, clicks: 0, conversion: 0 },
      month: { views: 0, clicks: 0, conversion: 0 },
      year: { views: 0, clicks: 0, conversion: 0 },
      total: {
        views: ad.viewCount,
        clicks: ad.clickCount,
        conversion: rate(ad.clickCount, ad.viewCount),
      },
    }

    for (const p of periods) {
      const d = maps[p].get(ad.id)
      if (d) {
        entry[p] = { views: d.views, clicks: d.clicks, conversion: rate(d.clicks, d.views) }
      }
    }

    totals.total.views += ad.viewCount
    totals.total.clicks += ad.clickCount
    for (const p of periods) {
      totals[p].views += entry[p].views
      totals[p].clicks += entry[p].clicks
    }

    return entry
  })

  const summary = {
    today: { ...totals.today, conversion: rate(totals.today.clicks, totals.today.views) },
    week: { ...totals.week, conversion: rate(totals.week.clicks, totals.week.views) },
    month: { ...totals.month, conversion: rate(totals.month.clicks, totals.month.views) },
    year: { ...totals.year, conversion: rate(totals.year.clicks, totals.year.views) },
    total: { ...totals.total, conversion: rate(totals.total.clicks, totals.total.views) },
  }

  return NextResponse.json({ data: result, summary })
}
