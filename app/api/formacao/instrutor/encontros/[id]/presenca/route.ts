import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoEncontros, formacaoMembros, formacaoPresencas } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { z } from "zod"

const schema = z.object({
  membroId: z.string().uuid(),
  presenca: z.enum(["pendente", "confirmado", "presente", "atrasado", "ausente"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: encontroId } = await params

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const { membroId, presenca } = parsed.data

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

    const [existing] = await db
      .select()
      .from(formacaoPresencas)
      .where(
        and(
          eq(formacaoPresencas.encontroId, encontroId),
          eq(formacaoPresencas.membroId, membroId),
        ),
      )
      .limit(1)

    const now = new Date()
    let result
    if (existing) {
      ;[result] = await db
        .update(formacaoPresencas)
        .set({
          presenca,
          confirmadoEm: ["presente", "atrasado", "confirmado"].includes(presenca)
            ? now
            : null,
          updatedAt: now,
        })
        .where(eq(formacaoPresencas.id, existing.id))
        .returning()
    } else {
      ;[result] = await db
        .insert(formacaoPresencas)
        .values({
          encontroId,
          membroId,
          presenca,
          confirmadoEm: ["presente", "atrasado", "confirmado"].includes(presenca)
            ? now
            : null,
        })
        .returning()
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
