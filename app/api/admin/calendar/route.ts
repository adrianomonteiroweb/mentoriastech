import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createCalendarEvent } from "@/lib/google-calendar"
import { z } from "zod"

const createEventSchema = z.object({
  summary: z.string(),
  description: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  attendeeEmail: z.string().email().optional(),
})

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const event = await createCalendarEvent(parsed.data)

    if (!event) {
      return NextResponse.json(
        { error: "Google Calendar nao configurado. Conecte em Configuracoes." },
        { status: 400 },
      )
    }

    return NextResponse.json({ eventId: event.eventId, meetLink: event.meetLink })
  } catch (error) {
    console.error("[calendar] Create event error:", error)
    return NextResponse.json(
      { error: "Erro ao criar evento no Google Calendar" },
      { status: 500 },
    )
  }
}
