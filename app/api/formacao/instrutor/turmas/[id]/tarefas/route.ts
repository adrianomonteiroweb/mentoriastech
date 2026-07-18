import { NextResponse } from "next/server"
import { db, formacaoCriteriosAceite, formacaoTarefas } from "@/lib/db"
import { getTurmaById } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { criarTarefaSchema } from "@/lib/formacao/validation"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireFormacaoInstrutor()
    const { id: turmaId } = await params

    const turma = await getTurmaById(turmaId)
    if (!turma) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = criarTarefaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const d = parsed.data
    const emptyToNull = (v?: string) => (v && v.length > 0 ? v : null)

    const [tarefa] = await db
      .insert(formacaoTarefas)
      .values({
        turmaId,
        titulo: d.titulo,
        contexto: emptyToNull(d.contexto),
        motivo: emptyToNull(d.motivo),
        politicaIa: emptyToNull(d.politicaIa),
        prazo: d.prazo ? new Date(d.prazo) : null,
        projetoId: emptyToNull(d.projetoId),
        etapaId: emptyToNull(d.etapaId),
        papelId: emptyToNull(d.papelId),
        membroId: emptyToNull(d.membroId),
        createdBy: profile.id,
      })
      .returning()

    if (d.criterios && d.criterios.length > 0) {
      await db.insert(formacaoCriteriosAceite).values(
        d.criterios.map((texto, i) => ({
          tarefaId: tarefa.id,
          texto,
          ordem: i,
        })),
      )
    }

    return NextResponse.json({ data: tarefa }, { status: 201 })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
