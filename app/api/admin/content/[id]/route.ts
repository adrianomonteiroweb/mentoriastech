import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, contentItems } from "@/lib/db"
import { toContentItem } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  category_id: z.string().uuid().optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  content_type: z.enum(["pdf", "article", "video", "link"]).optional(),
  url: z.string().url().optional().or(z.literal("")),
  article_body: z.string().optional(),
  is_published: z.boolean().optional(),
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
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof contentItems.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.category_id !== undefined) updateData.categoryId = parsed.data.category_id
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.content_type !== undefined) updateData.contentType = parsed.data.content_type
    if (parsed.data.url !== undefined) updateData.url = parsed.data.url || null
    if (parsed.data.article_body !== undefined) updateData.articleBody = parsed.data.article_body
    if (parsed.data.is_published !== undefined) updateData.isPublished = parsed.data.is_published

    const [data] = await db
      .update(contentItems)
      .set(updateData)
      .where(eq(contentItems.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Conteudo nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: toContentItem(data) })
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

    await db.delete(contentItems).where(eq(contentItems.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
