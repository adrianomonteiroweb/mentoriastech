import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEncontros, formacaoTurmas } from "@/lib/db"
import { getEncontroCondutorContext } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { z } from "zod"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: encontroId } = await params

    const [encontro] = await db
      .select({ turmaId: formacaoEncontros.turmaId })
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.id, encontroId))
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    const context = await getEncontroCondutorContext(encontroId, encontro.turmaId)
    if (!context) {
      return NextResponse.json({ error: "Dados não encontrados" }, { status: 404 })
    }

    return NextResponse.json({ data: context })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

const patchSchema = z.object({
  decisoes: z.string().optional(),
  proximosPassos: z.string().optional(),
  status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: encontroId } = await params

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const { decisoes, proximosPassos, status } = parsed.data

    const updates: Record<string, unknown> = {}
    if (decisoes !== undefined) updates.decisoes = decisoes
    if (proximosPassos !== undefined) updates.proximosPassos = proximosPassos
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    const [updated] = await db
      .update(formacaoEncontros)
      .set(updates)
      .where(eq(formacaoEncontros.id, encontroId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
