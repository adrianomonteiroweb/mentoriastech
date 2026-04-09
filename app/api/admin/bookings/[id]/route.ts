import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const updateSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "payment_pending",
      "paid",
      "scheduled",
      "completed",
      "cancelled",
    ])
    .optional(),
  notes: z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Buscar booking atual
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*, mentoring_topics(name), profiles(full_name, email)")
      .eq("id", id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Agendamento nao encontrado" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...parsed.data }

    // Se marcando como "scheduled", tentar criar evento no Google Calendar
    if (parsed.data.status === "scheduled") {
      try {
        const { createCalendarEvent } = await import("@/lib/google-calendar")

        const menteeEmail =
          booking.profiles?.email || booking.guest_email
        const menteeName =
          booking.profiles?.full_name || booking.guest_name || "Mentorado"
        const topicName =
          booking.mentoring_topics?.name || "Mentoria"

        if (booking.session_date && booking.start_time) {
          const eventId = await createCalendarEvent({
            summary: `Mentoria: ${topicName}`,
            description: `Mentoria com ${menteeName}\nTema: ${topicName}`,
            date: booking.session_date,
            time: booking.start_time.substring(0, 5),
            attendeeEmail: menteeEmail || undefined,
          })

          if (eventId) {
            updateData.google_event_id = eventId
          }
        }
      } catch (calendarError) {
        console.error("[bookings] Calendar error (non-blocking):", calendarError)
        // Não bloqueia a atualização do status se Calendar falhar
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
