import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEncontros } from "@/lib/db"
import { getTurmaById } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { gerarEncontrosSchema } from "@/lib/formacao/validation"
import { gerarDomingos } from "@/lib/formacao/schedule"

const QUANTIDADE_PADRAO = 12

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: turmaId } = await params

    const turma = await getTurmaById(turmaId)
    if (!turma) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = gerarEncontrosSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const quantidade = parsed.data.quantidade ?? QUANTIDADE_PADRAO

    const datas = gerarDomingos(turma.dataInicio, quantidade)
    const values = datas.map((data, i) => ({
      turmaId,
      numero: i + 1,
      data,
      linkMeet: turma.linkMeet,
      tipo: "semanal" as const,
    }))

    // Idempotente: encontros já existentes (mesmo turma+numero) são ignorados.
    await db.insert(formacaoEncontros).values(values).onConflictDoNothing()

    const encontros = await db
      .select()
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.turmaId, turmaId))
      .orderBy(formacaoEncontros.numero)

    return NextResponse.json({ data: encontros })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
