import { NextResponse } from "next/server"
import { requireMenteeAccess, MenteeAccessError } from "@/lib/utils/mentee-access"
import { getActiveTurmaMembershipForEmail, getRotacaoContext } from "@/lib/db/formacao"
import { isFormacaoPreviewEnabled } from "@/lib/formacao/preview"

export async function GET() {
  try {
    if (!isFormacaoPreviewEnabled()) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }
    const session = await requireMenteeAccess()
    const membership = await getActiveTurmaMembershipForEmail(session.email)
    if (!membership) {
      return NextResponse.json({ error: "Sem turma ativa" }, { status: 404 })
    }
    const rotacao = await getRotacaoContext(membership.turma, membership.membro)
    return NextResponse.json({ data: rotacao })
  } catch (error) {
    if (error instanceof MenteeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[formacao/turma/rotacao]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
