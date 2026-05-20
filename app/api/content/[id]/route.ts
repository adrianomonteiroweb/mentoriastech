import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, contentCategories, contentItems } from "@/lib/db"
import { toContentCategory, toContentItem } from "@/lib/db/mappers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const [row] = await db
      .select({ item: contentItems, category: contentCategories })
      .from(contentItems)
      .leftJoin(
        contentCategories,
        eq(contentItems.categoryId, contentCategories.id),
      )
      .where(and(eq(contentItems.id, id), eq(contentItems.isPublished, true)))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Conteudo nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...toContentItem(row.item),
        content_categories: row.category
          ? toContentCategory(row.category)
          : null,
      },
    })
  } catch (error) {
    console.error("[content] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar conteudo" }, { status: 500 })
  }
}
