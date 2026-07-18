import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEntregas, formacaoFeedbacks, formacaoTarefas } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { revisarEntregaSchema } from "@/lib/formacao/validation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireFormacaoInstrutor()
    const { id: entregaId } = await params

    const [entrega] = await db
      .select()
      .from(formacaoEntregas)
      .where(eq(formacaoEntregas.id, entregaId))
      .limit(1)
    if (!entrega) {
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = revisarEntregaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const { acao, comentario } = parsed.data

    const aprovar = acao === "aprovar"
    const novoStatusEntrega = aprovar ? "aprovada" : "correcao_solicitada"

    const [atualizada] = await db
      .update(formacaoEntregas)
      .set({ status: novoStatusEntrega, updatedAt: new Date() })
      .where(eq(formacaoEntregas.id, entregaId))
      .returning()

    if (comentario && comentario.trim()) {
      await db.insert(formacaoFeedbacks).values({
        entregaId,
        instrutorId: profile.id,
        comentario: comentario.trim(),
        statusSolicitado: novoStatusEntrega,
      })
    }

    // Aprovação conclui a tarefa; correção volta para "em andamento".
    await db
      .update(formacaoTarefas)
      .set({
        status: aprovar ? "concluida" : "em_andamento",
        updatedAt: new Date(),
      })
      .where(eq(formacaoTarefas.id, entrega.tarefaId))

    return NextResponse.json({ data: atualizada })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
