import { and, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEntregas, formacaoTarefas } from "@/lib/db"
import { getTarefaParaMembro } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { criarEntregaSchema } from "@/lib/formacao/validation"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireFormacaoAluno()
    const { id: tarefaId } = await params
    const acesso = await getTarefaParaMembro(tarefaId, session.email)
    if (!acesso) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = criarEntregaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const { tipo, conteudo, arquivoUrl } = parsed.data

    // Próxima versão da entrega deste aluno nesta tarefa (histórico preservado).
    const [{ maxVersao }] = await db
      .select({ maxVersao: sql<number>`coalesce(max(${formacaoEntregas.versao}), 0)` })
      .from(formacaoEntregas)
      .where(
        and(
          eq(formacaoEntregas.tarefaId, tarefaId),
          eq(formacaoEntregas.membroId, acesso.membro.id),
        ),
      )

    const [entrega] = await db
      .insert(formacaoEntregas)
      .values({
        tarefaId,
        membroId: acesso.membro.id,
        tipo,
        conteudo: conteudo || null,
        arquivoUrl: arquivoUrl || null,
        versao: Number(maxVersao) + 1,
        status: "enviada",
      })
      .returning()

    // Enviar a entrega coloca a tarefa em revisão.
    await db
      .update(formacaoTarefas)
      .set({ status: "em_revisao", updatedAt: new Date() })
      .where(eq(formacaoTarefas.id, tarefaId))

    return NextResponse.json({ data: entrega }, { status: 201 })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
