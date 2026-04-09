import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    // Usa service role para ler bookings sem RLS (dados públicos limitados)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Buscar slots ativos
    const { data: slots, error: slotsError } = await supabase
      .from("mentoring_slots")
      .select("id, day_of_week, start_time, slot_type")
      .eq("is_active", true)
      .order("day_of_week")
      .order("start_time")

    if (slotsError) {
      console.error("[schedule] Slots error:", slotsError)
      return NextResponse.json({ error: "Erro ao carregar horarios" }, { status: 500 })
    }

    // Buscar topics ativos
    const { data: topics, error: topicsError } = await supabase
      .from("mentoring_topics")
      .select("id, name, category")
      .eq("is_active", true)
      .order("sort_order")

    if (topicsError) {
      console.error("[schedule] Topics error:", topicsError)
      return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
    }

    // Calcular datas da semana atual (segunda a domingo)
    const now = new Date()
    const currentDay = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((currentDay + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const mondayStr = monday.toISOString().split("T")[0]
    const sundayStr = sunday.toISOString().split("T")[0]

    // Buscar bookings da semana atual (dados públicos: apenas tema e primeiro nome)
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
      .lte("session_date", sundayStr)
      .in("status", ["pending", "confirmed", "scheduled"])

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

    // Montar schedule: slots com bookings da semana
    const schedule = (slots || []).map((slot) => {
      // Encontrar a data dessa semana para esse dia da semana
      const slotDate = new Date(monday)
      const daysToAdd = ((slot.day_of_week - 1 + 7) % 7)
      slotDate.setDate(monday.getDate() + daysToAdd)
      const slotDateStr = slotDate.toISOString().split("T")[0]

      // Bookings para esse slot nessa semana
      const slotBookings = (bookings || [])
        .filter(
          (b) =>
            b.session_date === slotDateStr &&
            b.start_time === slot.start_time,
        )
        .map((b) => ({
          id: b.id,
          topic: (b.mentoring_topics as { name: string } | null)?.name || "Tema livre",
          firstName: b.mentee_id
            ? menteeNames[b.mentee_id] || "Mentorado"
            : b.guest_name?.split(" ")[0] || "Visitante",
          status: b.status,
        }))

      return {
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        dayName: DAY_NAMES[slot.day_of_week],
        startTime: slot.start_time.substring(0, 5), // "20:00:00" -> "20:00"
        slotType: slot.slot_type,
        date: slotDateStr,
        bookings: slotBookings,
        isAvailable: slotBookings.length === 0,
      }
    })

    return NextResponse.json({
      schedule,
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
