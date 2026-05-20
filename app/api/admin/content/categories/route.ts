import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { db, contentCategories } from "@/lib/db"
import { toContentCategory } from "@/lib/db/mappers"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  sort_order: z.number().default(0),
})

export async function GET() {
  try {
    const data = await db
      .select()
      .from(contentCategories)
      .orderBy(contentCategories.sortOrder)

    return NextResponse.json({ data: data.map(toContentCategory) })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar categorias" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [data] = await db
      .insert(contentCategories)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        sortOrder: parsed.data.sort_order,
      })
      .returning()

    return NextResponse.json({ data: toContentCategory(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
