import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, trackingLinks } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  utm_source: z.string().min(1).max(100).optional(),
  utm_medium: z.string().min(1).max(100).optional(),
  utm_campaign: z.string().max(200).optional().nullable(),
  destination_path: z.string().min(1).max(200).startsWith("/").optional(),
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
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const values: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.name !== undefined) values.name = parsed.data.name
    if (parsed.data.utm_source !== undefined) values.utmSource = parsed.data.utm_source
    if (parsed.data.utm_medium !== undefined) values.utmMedium = parsed.data.utm_medium
    if (parsed.data.utm_campaign !== undefined) values.utmCampaign = parsed.data.utm_campaign
    if (parsed.data.destination_path !== undefined) values.destinationPath = parsed.data.destination_path
    if (parsed.data.is_active !== undefined) values.isActive = parsed.data.is_active

    const [updated] = await db
      .update(trackingLinks)
      .set(values)
      .where(eq(trackingLinks.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Link nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tracking-links/id] PUT error:", error)
    return NextResponse.json({ error: "Erro ao atualizar link" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const [deleted] = await db
      .delete(trackingLinks)
      .where(eq(trackingLinks.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Link nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tracking-links/id] DELETE error:", error)
    return NextResponse.json({ error: "Erro ao deletar link" }, { status: 500 })
  }
}
