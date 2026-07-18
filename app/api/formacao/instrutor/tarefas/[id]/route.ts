import { NextResponse } from "next/server"
import { getTarefaDetalhe } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id } = await params
    const detalhe = await getTarefaDetalhe(id)
    if (!detalhe) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ data: detalhe })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
