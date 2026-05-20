import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["approved", "rejected", "expired"]),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof jobs.$inferInsert> = {
      status: parsed.data.status,
      updatedAt: new Date(),
    }

    if (parsed.data.status === "approved") {
      updateData.approvedBy = admin.id
      updateData.approvedAt = new Date()
    }

    const [data] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: toJob(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
