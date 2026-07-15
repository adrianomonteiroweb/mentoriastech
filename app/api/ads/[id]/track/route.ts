import { NextResponse } from "next/server"
import { and, eq, isNull, lt, or, sql } from "drizzle-orm"
import { db, ads, adDailyStats } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const event = body.event as string

    if (event === "view") {
      await Promise.all([
        db
          .update(ads)
          .set({ viewCount: sql`${ads.viewCount} + 1` })
          .where(eq(ads.id, id)),
        db
          .insert(adDailyStats)
          .values({ adId: id, statDate: sql`CURRENT_DATE`, viewCount: 1, clickCount: 0 })
          .onConflictDoUpdate({
            target: [adDailyStats.adId, adDailyStats.statDate],
            set: { viewCount: sql`${adDailyStats.viewCount} + 1` },
          }),
      ])
    } else if (event === "click") {
      const [[updated]] = await Promise.all([
        db
          .update(ads)
          .set({
            clickCount: sql`${ads.clickCount} + 1`,
            isActive: sql<boolean>`
              CASE
                WHEN ${ads.maxClicks} IS NOT NULL
                  AND ${ads.clickCount} + 1 >= ${ads.maxClicks}
                THEN false
                ELSE ${ads.isActive}
              END
            `,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ads.id, id),
              eq(ads.isActive, true),
              or(isNull(ads.maxClicks), lt(ads.clickCount, ads.maxClicks)),
            ),
          )
          .returning({
            clickCount: ads.clickCount,
            maxClicks: ads.maxClicks,
            isActive: ads.isActive,
          }),
        db
          .insert(adDailyStats)
          .values({ adId: id, statDate: sql`CURRENT_DATE`, viewCount: 0, clickCount: 1 })
          .onConflictDoUpdate({
            target: [adDailyStats.adId, adDailyStats.statDate],
            set: { clickCount: sql`${adDailyStats.clickCount} + 1` },
          }),
      ])

      return NextResponse.json({
        success: true,
        data: updated
          ? {
              click_count: updated.clickCount,
              max_clicks: updated.maxClicks,
              is_active: updated.isActive,
            }
          : null,
      })
    } else {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }
}
