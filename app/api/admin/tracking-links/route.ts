import { NextResponse } from "next/server"
import { desc, eq, and, gte, sql, count, countDistinct } from "drizzle-orm"
import { z } from "zod"
import { db, trackingLinks, pageEvents } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"

const createSchema = z.object({
  name: z.string().min(2).max(120),
  utm_source: z.string().min(1).max(100),
  utm_medium: z.string().min(1).max(100),
  utm_campaign: z.string().max(200).optional(),
  destination_path: z.string().min(1).max(200).startsWith("/").default("/"),
})

function periodToSince(period: string): Date | null {
  if (!period) return null
  const now = Date.now()
  const match = period.match(/^(\d+)([hd])$/)
  if (match) {
    const value = Math.min(Number(match[1]), match[2] === "d" ? 365 : 8760)
    const ms = match[2] === "h" ? value * 3600_000 : value * 86400_000
    return new Date(now - ms)
  }
  return null
}

export async function GET(request: Request) {
  try {
    await requireRole("admin")

    const { searchParams } = new URL(request.url)
    const since = periodToSince(searchParams.get("period") || "")

    const links = await db
      .select()
      .from(trackingLinks)
      .orderBy(desc(trackingLinks.createdAt))

    const linksWithStats = await Promise.all(
      links.map(async (link) => {
        const conditions = [eq(pageEvents.utmSource, link.utmSource), eq(pageEvents.utmMedium, link.utmMedium)]
        if (link.utmCampaign) {
          conditions.push(eq(pageEvents.utmCampaign, link.utmCampaign))
        }
        if (since) {
          conditions.push(gte(pageEvents.createdAt, since))
        }

        const [stats] = await db
          .select({
            totalViews: count(),
            uniqueVisitors: countDistinct(pageEvents.visitorHash),
          })
          .from(pageEvents)
          .where(and(...conditions))

        return {
          ...link,
          totalViews: stats?.totalViews ?? 0,
          uniqueVisitors: stats?.uniqueVisitors ?? 0,
        }
      }),
    )

    return NextResponse.json({ data: linksWithStats })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tracking-links] GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar links" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [data] = await db
      .insert(trackingLinks)
      .values({
        name: parsed.data.name,
        utmSource: parsed.data.utm_source,
        utmMedium: parsed.data.utm_medium,
        utmCampaign: parsed.data.utm_campaign || null,
        destinationPath: parsed.data.destination_path,
      })
      .returning()

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tracking-links] POST error:", error)
    return NextResponse.json({ error: "Erro ao criar link" }, { status: 500 })
  }
}
