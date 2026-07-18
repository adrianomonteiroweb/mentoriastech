import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, formacaoDailyIngles } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

const patchSchema = z.object({
  status: z
    .enum([
      "nao_iniciada",
      "repetida_leitura",
      "repetida_apoio",
      "repetida_sem_leitura",
      "usada_na_daily",
    ])
    .optional(),
  observacaoInstrutor: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id } = await params

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.observacaoInstrutor !== undefined)
      updates.observacaoInstrutor = parsed.data.observacaoInstrutor
    updates.updatedAt = new Date()

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    const [updated] = await db
      .update(formacaoDailyIngles)
      .set(updates)
      .where(eq(formacaoDailyIngles.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
