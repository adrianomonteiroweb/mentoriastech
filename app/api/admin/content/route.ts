import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { db, contentItems } from "@/lib/db"
import { toContentItem } from "@/lib/db/mappers"
import { z } from "zod"

const createSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  content_type: z.enum(["pdf", "article", "video"]),
  url: z.string().optional(),
  article_body: z.string().optional(),
  file_size_bytes: z.number().optional(),
  is_published: z.boolean().default(false),
})

export async function POST(request: Request) {
  try {
    const admin = await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [data] = await db
      .insert(contentItems)
      .values({
        categoryId: parsed.data.category_id,
        title: parsed.data.title,
        description: parsed.data.description,
        contentType: parsed.data.content_type,
        url: parsed.data.url,
        articleBody: parsed.data.article_body,
        fileSizeBytes: parsed.data.file_size_bytes,
        isPublished: parsed.data.is_published,
        createdBy: admin.id,
      })
      .returning()

    return NextResponse.json({ data: toContentItem(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
