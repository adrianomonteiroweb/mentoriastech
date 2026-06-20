import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db, paidMentorships } from "@/lib/db"

// Registra visualização ("view") e clique ("click") de uma mentoria paga.
// Best-effort: falhas não devem quebrar o fluxo público de agendamento.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const event = body.event as string

    if (event === "view") {
      await db
        .update(paidMentorships)
        .set({ viewCount: sql`${paidMentorships.viewCount} + 1` })
        .where(eq(paidMentorships.id, id))
    } else if (event === "click") {
      await db
        .update(paidMentorships)
        .set({ clickCount: sql`${paidMentorships.clickCount} + 1` })
        .where(eq(paidMentorships.id, id))
    } else {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }
}
