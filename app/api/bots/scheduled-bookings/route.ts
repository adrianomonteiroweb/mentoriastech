import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { and, eq, gte } from "drizzle-orm"
import { db, bookings, profiles, mentoringTopics } from "@/lib/db"

// Leitura para o bot de confirmação de mentoria (repo `bots`,
// app send-mentorship-confirmation). Retorna os agendamentos com status
// "scheduled" (Agendado) de hoje em diante, com o link do Google Meet que já
// fica gravado em bookings.google_meet_url quando o evento é criado. O bot
// dispara a confirmação por WhatsApp; aqui só lemos.

// Não cacheia: precisa refletir o estado atual dos agendamentos.
export const dynamic = "force-dynamic"

// Valida o Bearer token do bot com comparação timing-safe. Sem env configurada,
// o caminho fica desabilitado (retorna false) — espelha jobs/share/route.ts.
function isValidBotToken(request: Request): boolean {
  const expected = process.env.BOOKINGS_BOT_TOKEN
  if (!expected) return false

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// GET: lista agendamentos "scheduled" futuros (session_date >= hoje) para o bot.
// Aplica o fallback de contato perfil → guest e só devolve quem tem WhatsApp.
export async function GET(request: Request) {
  try {
    if (!isValidBotToken(request)) {
      return NextResponse.json(
        { error: "Token inválido ou ausente" },
        { status: 401 },
      )
    }

    // session_date é coluna `date` (YYYY-MM-DD); compara como string.
    const today = new Date().toISOString().slice(0, 10)

    const rows = await db
      .select({
        id: bookings.id,
        sessionDate: bookings.sessionDate,
        startTime: bookings.startTime,
        meetUrl: bookings.googleMeetUrl,
        menteeName: profiles.fullName,
        menteeWhatsapp: profiles.whatsapp,
        guestName: bookings.guestName,
        guestWhatsapp: bookings.guestWhatsapp,
        topic: mentoringTopics.name,
      })
      .from(bookings)
      .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
      .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
      .where(
        and(eq(bookings.status, "scheduled"), gte(bookings.sessionDate, today)),
      )

    const data = rows
      .map((r) => ({
        id: r.id,
        name: r.menteeName || r.guestName || null,
        whatsapp: r.menteeWhatsapp || r.guestWhatsapp || null,
        sessionDate: r.sessionDate,
        startTime: r.startTime,
        meetUrl: r.meetUrl,
        topic: r.topic,
      }))
      // Sem WhatsApp não há o que enviar — não trafega registro inútil.
      .filter((r) => !!r.whatsapp)

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
