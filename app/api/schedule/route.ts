import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { expandRRuleDates } from "@/lib/rrule-utils"

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

export async function GET() {
  try {
    // Service role necessário para ler bookings de outros usuários (dados públicos limitados)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Buscar slots ativos
    const { data: slots, error: slotsError } = await supabase
      .from("mentoring_slots")
      .select("id, day_of_week, start_time, slot_type, rrule, recurrence_start, recurrence_end")
      .eq("is_active", true)
      .order("start_time")

    if (slotsError) {
      console.error("[schedule] Slots error:", slotsError)
      return NextResponse.json({ error: "Erro ao carregar horarios" }, { status: 500 })
    }

    // Buscar topics ativos
    const { data: topics, error: topicsError } = await supabase
      .from("mentoring_topics")
      .select("id, name, category, description")
      .eq("is_active", true)
      .order("sort_order")

    if (topicsError) {
      console.error("[schedule] Topics error:", topicsError)
      return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
    }

    // Calcular ranges
    const now = new Date()
    const currentDay = now.getDay()

    // Semana atual (segunda a domingo) para slots gratuitos
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((currentDay + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // 4 semanas à frente para slots pagos (RRule)
    const fourWeeksOut = new Date(now)
    fourWeeksOut.setDate(fourWeeksOut.getDate() + 28)
    fourWeeksOut.setHours(23, 59, 59, 999)

    const mondayStr = monday.toISOString().split("T")[0]
    const sundayStr = sunday.toISOString().split("T")[0]
    const fourWeeksStr = fourWeeksOut.toISOString().split("T")[0]

    // Buscar bookings do range completo (inclui bookings pagos nas próximas 4 semanas)
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        slot_id,
        topic_id,
        session_date,
        start_time,
        status,
        guest_name,
        mentee_id,
        mentoring_topics (name)
      `)
      .gte("session_date", mondayStr)
      .lte("session_date", fourWeeksStr)
      .in("status", ["pending", "confirmed", "paid", "scheduled"])

    if (bookingsError) {
      console.error("[schedule] Bookings error:", bookingsError)
    }

    // Para bookings com mentee_id, buscar primeiro nome
    const menteeIds = (bookings || [])
      .filter((b) => b.mentee_id)
      .map((b) => b.mentee_id)

    let menteeNames: Record<string, string> = {}
    if (menteeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", menteeIds)

      if (profiles) {
        menteeNames = Object.fromEntries(
          profiles.map((p) => [p.id, p.full_name?.split(" ")[0] || "Mentorado"]),
        )
      }
    }

    // Helper para encontrar bookings de uma data+hora
    function getSlotBookings(dateStr: string, startTime: string) {
      return (bookings || [])
        .filter((b) => b.session_date === dateStr && b.start_time === startTime)
        .map((b) => ({
          id: b.id,
          topic: (b.mentoring_topics as { name: string } | null)?.name || "Tema livre",
          firstName: b.mentee_id
            ? menteeNames[b.mentee_id] || "Mentorado"
            : b.guest_name?.split(" ")[0] || "Visitante",
          status: b.status,
        }))
    }

    // Separar slots por tipo
    const freeSlots = (slots || []).filter((s) => !s.rrule && s.day_of_week !== null)
    const paidSlots = (slots || []).filter((s) => s.rrule)

    // --- Montar schedule para slots GRATUITOS (semana atual) ---
    const freeSchedule = freeSlots.map((slot) => {
      const slotDate = new Date(monday)
      const daysToAdd = ((slot.day_of_week! - 1 + 7) % 7)
      slotDate.setDate(monday.getDate() + daysToAdd)
      const slotDateStr = slotDate.toISOString().split("T")[0]
      const startTime = slot.start_time.substring(0, 5)
      const slotBookings = getSlotBookings(slotDateStr, slot.start_time)

      return {
        id: slot.id,
        dayOfWeek: slot.day_of_week!,
        dayName: DAY_NAMES[slot.day_of_week!],
        startTime,
        slotType: slot.slot_type,
        date: slotDateStr,
        bookings: slotBookings,
        isAvailable: slotBookings.length === 0,
      }
    })

    // --- Montar schedule para slots PAGOS (RRule, próximas 4 semanas) ---
    const paidSchedule: typeof freeSchedule = []
    for (const slot of paidSlots) {
      if (!slot.rrule || !slot.recurrence_start) continue

      const dates = expandRRuleDates(
        slot.rrule,
        slot.recurrence_start,
        slot.recurrence_end,
        now,
        fourWeeksOut,
      )

      for (const dateStr of dates) {
        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay()
        const startTime = slot.start_time.substring(0, 5)
        const slotBookings = getSlotBookings(dateStr, slot.start_time)

        paidSchedule.push({
          id: `${slot.id}_${dateStr}`,
          dayOfWeek: dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          startTime,
          slotType: slot.slot_type,
          date: dateStr,
          bookings: slotBookings,
          isAvailable: slotBookings.length === 0,
        })
      }
    }

    // Combinar e ordenar por data crescente
    const schedule = [...freeSchedule, ...paidSchedule]
    schedule.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })

    // Filtrar slots cujo date+time já passou
    const nowISO = now.toISOString()
    const futureSchedule = schedule.filter((slot) => {
      const slotDateTime = `${slot.date}T${slot.startTime}:00`
      return slotDateTime > nowISO
    })

    return NextResponse.json({
      schedule: futureSchedule,
      topics,
      weekStart: mondayStr,
      weekEnd: sundayStr,
    })
  } catch (error) {
    console.error("[schedule] Error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar agenda" },
      { status: 500 },
    )
  }
}
