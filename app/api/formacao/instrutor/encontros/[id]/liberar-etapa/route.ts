import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEncontros, formacaoMembros, formacaoPresencas } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: encontroId } = await params

    const [encontro] = await db
      .select()
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.id, encontroId))
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    const membros = await db
      .select({ id: formacaoMembros.id })
      .from(formacaoMembros)
      .where(eq(formacaoMembros.turmaId, encontro.turmaId))

    if (membros.length === 0) {
      return NextResponse.json({ error: "Nenhum membro na turma" }, { status: 400 })
    }

    const membroIds = membros.map((m) => m.id)
    const presencas = await db
      .select()
      .from(formacaoPresencas)
      .where(
        and(
          eq(formacaoPresencas.encontroId, encontroId),
          inArray(formacaoPresencas.membroId, membroIds),
        ),
      )

    const presencaMap = new Map(presencas.map((p) => [p.membroId, p.presenca]))
    const VALIDAS = ["presente", "atrasado"]
    const semPresenca = membroIds.filter(
      (id) => !presencaMap.has(id) || !VALIDAS.includes(presencaMap.get(id)!),
    )

    if (semPresenca.length > 0) {
      return NextResponse.json(
        {
          error: `${semPresenca.length} membro(s) sem presença registrada. Registre a presença de todos antes de liberar.`,
        },
        { status: 400 },
      )
    }

    const [updated] = await db
      .update(formacaoEncontros)
      .set({ status: "realizado" })
      .where(eq(formacaoEncontros.id, encontroId))
      .returning()

    return NextResponse.json({
      data: updated,
      message: "Encontro marcado como realizado. Próxima etapa liberada.",
    })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
