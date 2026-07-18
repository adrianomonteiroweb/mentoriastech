import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoDailyEntries, formacaoDailyIngles } from "@/lib/db"
import { requireMenteeAccess, MenteeAccessError } from "@/lib/utils/mentee-access"
import { getActiveTurmaMembershipForEmail } from "@/lib/db/formacao"
import { isFormacaoPreviewEnabled } from "@/lib/formacao/preview"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encontroId: string }> },
) {
  try {
    if (!isFormacaoPreviewEnabled()) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    const session = await requireMenteeAccess()
    const membership = await getActiveTurmaMembershipForEmail(session.email)
    if (!membership) {
      return NextResponse.json({ error: "Sem turma ativa" }, { status: 404 })
    }

    const { encontroId } = await params
    const membroId = membership.membro.id

    const [daily] = await db
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
      return NextResponse.json({ data: null })
    }

    const [ingles] = await db
      .select()
      .from(formacaoDailyIngles)
      .where(eq(formacaoDailyIngles.dailyEntryId, daily.id))
      .limit(1)

    return NextResponse.json({ data: ingles ?? null })
  } catch (error) {
    if (error instanceof MenteeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[formacao/turma/daily-ingles]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
