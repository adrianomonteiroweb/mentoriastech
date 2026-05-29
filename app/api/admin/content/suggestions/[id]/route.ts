import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, contentSuggestions } from "@/lib/db"
import { toContentSuggestion } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

const updateSchema = z.object({
  status: z.enum(["pending", "reviewed", "approved", "archived"]),
})

// PUT: muda o status da sugestao (admin)
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
      return NextResponse.json({ error: "Status invalido" }, { status: 400 })
    }

    const [data] = await db
      .update(contentSuggestions)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(contentSuggestions.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Sugestao nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: toContentSuggestion(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE: remove a sugestao (admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    await db.delete(contentSuggestions).where(eq(contentSuggestions.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
