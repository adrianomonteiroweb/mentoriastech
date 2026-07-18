import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoCriteriosAceite } from "@/lib/db"
import { getTarefaParaMembro } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { criterioToggleSchema } from "@/lib/formacao/validation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; criterioId: string }> },
) {
  try {
    const session = await requireFormacaoAluno()
    const { id: tarefaId, criterioId } = await params
    const acesso = await getTarefaParaMembro(tarefaId, session.email)
    if (!acesso) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = criterioToggleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const [criterio] = await db
      .update(formacaoCriteriosAceite)
      .set({ concluido: parsed.data.concluido })
      .where(
        and(
          eq(formacaoCriteriosAceite.id, criterioId),
          eq(formacaoCriteriosAceite.tarefaId, tarefaId),
        ),
      )
      .returning()

    if (!criterio) {
      return NextResponse.json({ error: "Critério não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ data: criterio })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
