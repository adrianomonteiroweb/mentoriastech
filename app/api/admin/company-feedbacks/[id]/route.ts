import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { requireRole } from "@/lib/utils/auth"
import { db, companyFeedbacks } from "@/lib/db"

const updateSchema = z.object({
  status: z.enum(["pending", "reviewed", "blocked"]),
  admin_notes: z.string().max(500).optional(),
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

    const { status, admin_notes } = parsed.data

    const [updated] = await db
      .update(companyFeedbacks)
      .set({
        status,
        adminNotes: admin_notes ?? null,
      })
      .where(eq(companyFeedbacks.id, id))
      .returning({ id: companyFeedbacks.id })

    if (!updated) {
      return NextResponse.json({ error: "Feedback não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
