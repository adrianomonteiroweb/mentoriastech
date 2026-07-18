import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoTurmas } from "@/lib/db"
import { getTurmaDetalhe } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { editarTurmaSchema } from "@/lib/formacao/validation"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id } = await params
    const detalhe = await getTurmaDetalhe(id)
    if (!detalhe) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ data: detalhe })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id } = await params
    const body = await request.json()
    const parsed = editarTurmaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    const { nome, empresaFicticia, linkMeet, faseAtual, status } = parsed.data
    if (nome !== undefined) patch.nome = nome
    if (empresaFicticia !== undefined) patch.empresaFicticia = empresaFicticia || null
    if (linkMeet !== undefined) patch.linkMeet = linkMeet || null
    if (faseAtual !== undefined) patch.faseAtual = faseAtual
    if (status !== undefined) patch.status = status

    const [turma] = await db
      .update(formacaoTurmas)
      .set(patch)
      .where(eq(formacaoTurmas.id, id))
      .returning()

    if (!turma) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ data: turma })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id } = await params
    await db.delete(formacaoTurmas).where(eq(formacaoTurmas.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
