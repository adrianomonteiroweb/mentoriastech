import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { contentCategories, contentItems, db } from "@/lib/db"
import { toContentCategory, toContentItem } from "@/lib/db/mappers"
import { z } from "zod"

const linkItemSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1),
})

const createSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  content_type: z.enum(["pdf", "article", "video", "link"]),
  url: z.string().url().optional().or(z.literal("")),
  links: z.array(linkItemSchema).optional(),
  article_body: z.string().optional(),
  file_size_bytes: z.number().optional(),
  is_published: z.boolean().default(false),
})

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({ item: contentItems, category: contentCategories })
      .from(contentItems)
      .leftJoin(
        contentCategories,
        eq(contentItems.categoryId, contentCategories.id),
      )
      .orderBy(desc(contentItems.createdAt))

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toContentItem(row.item),
        content_categories: row.category
          ? toContentCategory(row.category)
          : null,
      })),
    })
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
        url: parsed.data.url || undefined,
        links: parsed.data.links ?? undefined,
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
