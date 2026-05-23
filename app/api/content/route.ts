import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db, contentCategories, contentItems } from "@/lib/db"
import { toContentCategory, toContentItem } from "@/lib/db/mappers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const filters = [eq(contentItems.isPublished, true)]
    if (category) {
      filters.push(eq(contentCategories.slug, category))
    }

    const rows = await db
      .select({ item: contentItems, category: contentCategories })
      .from(contentItems)
      .leftJoin(
        contentCategories,
        eq(contentItems.categoryId, contentCategories.id),
      )
      .where(and(...filters))
      .orderBy(desc(contentItems.viewCount), desc(contentItems.createdAt))

    const categories = await db
      .select()
      .from(contentCategories)
      .orderBy(contentCategories.sortOrder)

    const data = rows.map((row) => ({
      ...toContentItem(row.item),
      content_categories: row.category
        ? toContentCategory(row.category)
        : null,
    }))

    return NextResponse.json({
      data,
      categories: categories.map(toContentCategory),
    })
  } catch (error) {
    console.error("[content] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar conteudos" }, { status: 500 })
  }
}
