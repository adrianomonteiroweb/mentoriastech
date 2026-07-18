import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
  db,
  formacaoAtribuicoesPapel,
  formacaoEncontros,
  formacaoFases,
  formacaoMembros,
  formacaoPapeis,
} from "@/lib/db"
import { getTurmaById } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { atribuirPapeisSchema } from "@/lib/formacao/validation"

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
    const parsed = atribuirPapeisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const { encontroId, atribuicoes } = parsed.data

    // Encontro pertence à turma?
    const [encontro] = await db
      .select({ id: formacaoEncontros.id })
      .from(formacaoEncontros)
      .where(
        and(
          eq(formacaoEncontros.id, encontroId),
          eq(formacaoEncontros.turmaId, turmaId),
        ),
      )
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro inválido" }, { status: 400 })
    }

    // Conjuntos válidos de membros (da turma) e papéis (da fase atual).
    const membrosValidos = await db
      .select({ id: formacaoMembros.id })
      .from(formacaoMembros)
      .where(eq(formacaoMembros.turmaId, turmaId))
    const papeisValidos = await db
      .select({ id: formacaoPapeis.id })
      .from(formacaoPapeis)
      .innerJoin(formacaoFases, eq(formacaoPapeis.faseId, formacaoFases.id))
      .where(eq(formacaoFases.numero, turma.faseAtual))

    const membroSet = new Set(membrosValidos.map((m) => m.id))
    const papelSet = new Set(papeisValidos.map((p) => p.id))

    for (const a of atribuicoes) {
      if (!membroSet.has(a.membroId)) {
        return NextResponse.json(
          { error: "Membro não pertence à turma" },
          { status: 400 },
        )
      }
      if (!papelSet.has(a.papelId)) {
        return NextResponse.json(
          { error: "Papel não pertence à fase atual da turma" },
          { status: 400 },
        )
      }
    }

    // Substitui a escalação deste encontro (edição da grade antes/no encontro).
    // O histórico dos demais encontros permanece intacto.
    const membroIds = atribuicoes.map((a) => a.membroId)
    await db
      .delete(formacaoAtribuicoesPapel)
      .where(
        and(
          eq(formacaoAtribuicoesPapel.encontroId, encontroId),
          inArray(formacaoAtribuicoesPapel.membroId, membroIds),
        ),
      )

    await db.insert(formacaoAtribuicoesPapel).values(
      atribuicoes.map((a) => ({
        turmaId,
        membroId: a.membroId,
        papelId: a.papelId,
        encontroId,
        atribuidoPor: profile.id,
      })),
    )

    const todas = await db
      .select()
      .from(formacaoAtribuicoesPapel)
      .where(eq(formacaoAtribuicoesPapel.turmaId, turmaId))

    return NextResponse.json({ data: todas })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
