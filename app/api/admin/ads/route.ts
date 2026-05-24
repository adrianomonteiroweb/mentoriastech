import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, ads } from "@/lib/db"
import { toAd } from "@/lib/db/mappers"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  whatsapp_number: z.string().optional(),
  link_url: z.string().url().optional().or(z.literal("")),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  max_clicks: z.number().int().min(1).nullable().optional(),
})

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select()
      .from(ads)
      .orderBy(asc(ads.sortOrder), asc(ads.createdAt))

    return NextResponse.json({ data: rows.map(toAd) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [data] = await db
      .insert(ads)
      .values({
        title: parsed.data.title,
        description: parsed.data.description,
        imageUrl: parsed.data.image_url || undefined,
        whatsappNumber: parsed.data.whatsapp_number,
        linkUrl: parsed.data.link_url || undefined,
        sortOrder: parsed.data.sort_order,
        isActive: parsed.data.is_active,
        maxClicks: parsed.data.max_clicks ?? undefined,
        createdBy: admin.id,
      })
      .returning()

    return NextResponse.json({ data: toAd(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
