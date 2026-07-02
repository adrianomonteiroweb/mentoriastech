import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { db, bookings } from "@/lib/db"
import { transcribeBookingSession } from "@/lib/transcription"

// Não cacheia e dá folga de tempo: a transcrição via IA é lenta.
export const dynamic = "force-dynamic"
export const maxDuration = 300

// Lote pequeno por execução para respeitar o free tier do Gemini (15 RPM /
// 1.500 RPD) e o timeout da função. O cron roda com frequência e drena a fila.
const BATCH_LIMIT = 3

// Valida o Bearer token do cron (Vercel injeta Authorization: Bearer ${CRON_SECRET}).
// Sem env configurada, o endpoint fica desabilitado — espelha bots/scheduled-bookings.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// GET: transcreve mentorias concluídas que têm áudio e ainda não foram
// processadas (status null/pending). "failed" NÃO é reprocessado aqui — exige
// regeneração manual no painel para não entrar em loop de tentativas.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let candidates: { id: string }[]
  try {
    candidates = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "completed"),
          or(
            isNull(bookings.aiTranscriptStatus),
            inArray(bookings.aiTranscriptStatus, ["pending"]),
          ),
          sql`EXISTS (
            SELECT 1 FROM booking_attachments ba
            WHERE ba.booking_id = ${bookings.id}
              AND ba.type = 'audio'
              AND ba.file_url IS NOT NULL
          )`,
        ),
      )
      .limit(BATCH_LIMIT)
  } catch (error) {
    console.error("[cron/transcribe-sessions] query error:", error)
    return NextResponse.json({ error: "Erro ao buscar mentorias" }, { status: 500 })
  }

  const results: { bookingId: string; status: string; error?: string }[] = []
  for (const candidate of candidates) {
    try {
      const outcome = await transcribeBookingSession({
        bookingId: candidate.id,
        request,
        route: "/api/cron/transcribe-sessions",
      })
      results.push({ bookingId: candidate.id, status: outcome.status })
    } catch (error) {
      results.push({
        bookingId: candidate.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
