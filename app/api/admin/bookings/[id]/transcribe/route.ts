import { NextResponse } from "next/server"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { ResumeAIError } from "@/lib/ai/gemini"
import { transcribeBookingSession } from "@/lib/transcription"

interface RouteContext {
  params: Promise<{ id: string }>
}

// A transcrição via IA pode demorar; sobe o teto do timeout da função.
export const maxDuration = 300

// POST: gera (ou regenera) a transcrição + resumo do áudio da mentoria.
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireMentorAccess()
    const { id } = await context.params

    const outcome = await transcribeBookingSession({
      bookingId: id,
      actorId: user.id,
      request,
      route: `/api/admin/bookings/${id}/transcribe`,
    })

    if (outcome.status === "skipped") {
      return NextResponse.json(
        { error: "Nenhum áudio gravado nesta mentoria para transcrever." },
        { status: 400 },
      )
    }

    return NextResponse.json({ data: outcome })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ResumeAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[bookings/transcribe] POST error:", error)
    return NextResponse.json({ error: "Erro ao transcrever a mentoria" }, { status: 500 })
  }
}
