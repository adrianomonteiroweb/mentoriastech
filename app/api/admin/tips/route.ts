import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { z } from "zod"
import { db, tips } from "@/lib/db"
import { toTip } from "@/lib/db/mappers"
import { AuthError, requireRole } from "@/lib/utils/auth"

const createSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(10).max(700),
  placement: z.enum(["content", "jobs", "both"]).default("both"),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_fixed: z.boolean().default(false),
})

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select()
      .from(tips)
      .orderBy(asc(tips.placement), asc(tips.sortOrder), asc(tips.createdAt))

    return NextResponse.json({ data: rows.map(toTip) })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tips] GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar dicas" }, { status: 500 })
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
      .insert(tips)
      .values({
        title: parsed.data.title,
        body: parsed.data.body,
        placement: parsed.data.placement,
        sortOrder: parsed.data.sort_order,
        isActive: parsed.data.is_fixed ? true : parsed.data.is_active,
        isFixed: parsed.data.is_fixed,
        createdBy: admin.id,
      })
      .returning()

    return NextResponse.json({ data: toTip(data) }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/tips] POST error:", error)
    return NextResponse.json({ error: "Erro ao criar dica" }, { status: 500 })
  }
}
