import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoDailyEntries, formacaoEncontros } from "@/lib/db"
import { getMembroAtivoNaTurma } from "@/lib/db/formacao"
import { requireFormacaoAluno, formacaoErrorResponse } from "@/lib/formacao/auth"
import { registrarDailySchema } from "@/lib/formacao/validation"

export async function POST(request: Request) {
  try {
    const session = await requireFormacaoAluno()
    const body = await request.json()
    const parsed = registrarDailySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const d = parsed.data

    const [encontro] = await db
      .select()
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.id, d.encontroId))
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    const membro = await getMembroAtivoNaTurma(encontro.turmaId, session.email)
    if (!membro) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const now = new Date()
    // No prazo se registrada até o horário do encontro.
    const noPrazo = now <= new Date(encontro.data)

    const [daily] = await db
      .insert(formacaoDailyEntries)
      .values({
        encontroId: d.encontroId,
        membroId: membro.id,
        concluidoPt: d.concluidoPt || null,
        andamentoPt: d.andamentoPt || null,
        proximoPt: d.proximoPt || null,
        bloqueioPt: d.bloqueioPt || null,
        ajudaPt: d.ajudaPt || null,
        registradoEm: now,
        noPrazo,
      })
      .onConflictDoUpdate({
        target: [
          formacaoDailyEntries.encontroId,
          formacaoDailyEntries.membroId,
        ],
        set: {
          concluidoPt: d.concluidoPt || null,
          andamentoPt: d.andamentoPt || null,
          proximoPt: d.proximoPt || null,
          bloqueioPt: d.bloqueioPt || null,
          ajudaPt: d.ajudaPt || null,
          registradoEm: now,
          noPrazo,
          updatedAt: now,
        },
      })
      .returning()

    return NextResponse.json({ data: daily })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
