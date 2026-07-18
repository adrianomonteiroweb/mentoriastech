import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
  db,
  formacaoDailyEntries,
  formacaoDailyIngles,
  formacaoEncontros,
  formacaoMembros,
} from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { z } from "zod"

const schema = z.object({
  fraseCompletaPt: z.string().optional(),
  fraseCompletaEn: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; membroId: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: encontroId, membroId } = await params

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const [encontro] = await db
      .select({ id: formacaoEncontros.id, turmaId: formacaoEncontros.turmaId })
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.id, encontroId))
      .limit(1)
    if (!encontro) {
      return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 })
    }

    const [membro] = await db
      .select({ id: formacaoMembros.id })
      .from(formacaoMembros)
      .where(
        and(
          eq(formacaoMembros.id, membroId),
          eq(formacaoMembros.turmaId, encontro.turmaId),
        ),
      )
      .limit(1)
    if (!membro) {
      return NextResponse.json({ error: "Membro não pertence à turma" }, { status: 400 })
    }

    let [daily] = await db
      .select()
      .from(formacaoDailyEntries)
      .where(
        and(
          eq(formacaoDailyEntries.encontroId, encontroId),
          eq(formacaoDailyEntries.membroId, membroId),
        ),
      )
      .limit(1)

    if (!daily) {
      [daily] = await db
        .insert(formacaoDailyEntries)
        .values({ encontroId, membroId })
        .returning()
    }

    const { fraseCompletaPt, fraseCompletaEn } = parsed.data

    const [existing] = await db
      .select()
      .from(formacaoDailyIngles)
      .where(eq(formacaoDailyIngles.dailyEntryId, daily.id))
      .limit(1)

    let ingles
    if (existing) {
      const updates: Record<string, unknown> = {}
      if (fraseCompletaPt !== undefined) updates.fraseCompletaPt = fraseCompletaPt
      if (fraseCompletaEn !== undefined) updates.fraseCompletaEn = fraseCompletaEn
      ;[ingles] = await db
        .update(formacaoDailyIngles)
        .set(updates)
        .where(eq(formacaoDailyIngles.id, existing.id))
        .returning()
    } else {
      ;[ingles] = await db
        .insert(formacaoDailyIngles)
        .values({
          dailyEntryId: daily.id,
          fraseCompletaPt: fraseCompletaPt ?? null,
          fraseCompletaEn: fraseCompletaEn ?? null,
        })
        .returning()
    }

    return NextResponse.json({ data: { daily, ingles } })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
