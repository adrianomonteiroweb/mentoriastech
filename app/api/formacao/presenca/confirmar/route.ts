import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEncontros, formacaoPresencas } from "@/lib/db"
import { getMembroAtivoNaTurma } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { confirmarPresencaSchema } from "@/lib/formacao/validation"

export async function POST(request: Request) {
  try {
    const session = await requireFormacaoAluno()
    const body = await request.json()
    const parsed = confirmarPresencaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const [encontro] = await db
      .select()
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.id, parsed.data.encontroId))
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    const membro = await getMembroAtivoNaTurma(encontro.turmaId, session.email)
    if (!membro) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const now = new Date()
    const [presenca] = await db
      .insert(formacaoPresencas)
      .values({
        encontroId: encontro.id,
        membroId: membro.id,
        presenca: "confirmado",
        confirmadoEm: now,
      })
      .onConflictDoUpdate({
        target: [formacaoPresencas.encontroId, formacaoPresencas.membroId],
        set: { presenca: "confirmado", confirmadoEm: now, updatedAt: now },
      })
      .returning()

    return NextResponse.json({ data: presenca })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
