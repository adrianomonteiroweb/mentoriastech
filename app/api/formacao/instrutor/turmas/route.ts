import { NextResponse } from "next/server"
import { db, formacaoTurmas } from "@/lib/db"
import { listarTurmas } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { criarTurmaSchema } from "@/lib/formacao/validation"

export async function GET() {
  try {
    await requireFormacaoInstrutor()
    const turmas = await listarTurmas()
    return NextResponse.json({ data: turmas })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireFormacaoInstrutor()
    const body = await request.json()
    const parsed = criarTurmaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const { nome, empresaFicticia, linkMeet, dataInicio } = parsed.data
    const [turma] = await db
      .insert(formacaoTurmas)
      .values({
        nome,
        empresaFicticia: empresaFicticia || null,
        linkMeet: linkMeet || null,
        dataInicio,
        instrutorId: profile.id,
        status: "planejada",
      })
      .returning()

    return NextResponse.json({ data: turma }, { status: 201 })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
