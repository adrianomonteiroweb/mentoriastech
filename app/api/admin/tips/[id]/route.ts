import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, tips } from "@/lib/db"
import { toTip } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

const updateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  body: z.string().min(10).max(700).optional(),
  placement: z.enum(["content", "jobs", "both"]).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
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

    const updateData: Partial<typeof tips.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.body !== undefined) updateData.body = parsed.data.body
    if (parsed.data.placement !== undefined) updateData.placement = parsed.data.placement
    if (parsed.data.sort_order !== undefined) updateData.sortOrder = parsed.data.sort_order
    if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active

    const [data] = await db
      .update(tips)
      .set(updateData)
      .where(eq(tips.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Dica não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: toTip(data) })
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

    const [deleted] = await db.delete(tips).where(eq(tips.id, id)).returning()

    if (!deleted) {
      return NextResponse.json({ error: "Dica não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
