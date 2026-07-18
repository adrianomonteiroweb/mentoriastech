import { NextResponse } from "next/server"
import { getTurmaById, getRotacaoInstrutorContext } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: turmaId } = await params

    const turma = await getTurmaById(turmaId)
    if (!turma) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }

    const rotacao = await getRotacaoInstrutorContext(turma)
    return NextResponse.json({ data: rotacao })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
