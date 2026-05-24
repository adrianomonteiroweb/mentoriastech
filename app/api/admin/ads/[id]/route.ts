import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, ads } from "@/lib/db"
import { toAd } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  whatsapp_number: z.string().optional(),
  link_url: z.string().url().optional().or(z.literal("")),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  max_clicks: z.number().int().min(1).nullable().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.image_url !== undefined) updateData.imageUrl = parsed.data.image_url || null
    if (parsed.data.whatsapp_number !== undefined) updateData.whatsappNumber = parsed.data.whatsapp_number
    if (parsed.data.link_url !== undefined) updateData.linkUrl = parsed.data.link_url || null
    if (parsed.data.sort_order !== undefined) updateData.sortOrder = parsed.data.sort_order
    if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active
    if (parsed.data.max_clicks !== undefined) updateData.maxClicks = parsed.data.max_clicks

    const [data] = await db
      .update(ads)
      .set(updateData)
      .where(eq(ads.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toAd(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const [deleted] = await db.delete(ads).where(eq(ads.id, id)).returning()

    if (!deleted) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
