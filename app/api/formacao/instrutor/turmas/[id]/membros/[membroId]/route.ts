import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoMembros } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; membroId: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: turmaId, membroId } = await params

    await db
      .delete(formacaoMembros)
      .where(
        and(
          eq(formacaoMembros.id, membroId),
          eq(formacaoMembros.turmaId, turmaId),
        ),
      )

    return NextResponse.json({ ok: true })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
