import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoTarefas } from "@/lib/db"
import { getTarefaParaMembro } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { tarefaStatusSchema } from "@/lib/formacao/validation"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireFormacaoAluno()
    const { id } = await params
    const acesso = await getTarefaParaMembro(id, session.email)
    if (!acesso) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ data: acesso.detalhe, membroId: acesso.membro.id })
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
    const session = await requireFormacaoAluno()
    const { id } = await params
    const acesso = await getTarefaParaMembro(id, session.email)
    if (!acesso) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = tarefaStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const [tarefa] = await db
      .update(formacaoTarefas)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(formacaoTarefas.id, id))
      .returning()

    return NextResponse.json({ data: tarefa })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
