import { NextResponse } from "next/server"
import { getTarefaParaMembro } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { uploadFile, UploadError } from "@/lib/utils/upload"

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

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 })
    }

    const result = await uploadFile(
      file,
      `formacao/entregas/${tarefaId}`,
      "mentorship",
    )

    return NextResponse.json({ url: result.url, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
