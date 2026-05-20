"use client"

import { useEffect, useState } from "react"
import {
  CalendarDays,
  Clock,
  User,
  BookOpen,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

interface SlotBooking {
  id: string
  topic: string
  firstName: string
  status: string
}

interface ScheduleSlot {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  slotType: string
  date: string
  bookings: SlotBooking[]
  isAvailable: boolean
}

interface ScheduleData {
  schedule: ScheduleSlot[]
  weekStart: string
  weekEnd: string
}

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

const SCHEDULE_TEMPLATE = [
  { day: 1, times: ["21:00"] },
  { day: 2, times: ["21:00"] },
  { day: 3, times: ["21:00"] },
  { day: 4, times: ["21:00"] },
  { day: 5, times: ["21:00"] },
  { day: 6, times: ["10:00", "14:00"] },
  { day: 0, times: ["10:00", "14:00"] },
]

function generateFallbackSchedule(): ScheduleData {
  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const monday = new Date(now)
  monday.setDate(now.getDate() - ((currentDay + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const slots: ScheduleSlot[] = []

  for (const entry of SCHEDULE_TEMPLATE) {
    let diff = entry.day - currentDay
    if (diff < 0) diff += 7

    const date = new Date(now)
    date.setDate(now.getDate() + diff)
    const dateStr = date.toISOString().split("T")[0]

    for (const time of entry.times) {
      const [h, m] = time.split(":").map(Number)
      const isToday = diff === 0
      const isPast = isToday && (currentHour > h || (currentHour === h && currentMinute >= m))
      if (isPast) continue

      slots.push({
        id: `fallback-${entry.day}-${time}`,
        dayOfWeek: entry.day,
        dayName: DAY_NAMES[entry.day],
        startTime: time,
        slotType: "free",
        date: dateStr,
        bookings: [],
        isAvailable: true,
      })
    }
  }

  slots.sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))

  return {
    schedule: slots,
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  }
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((json) => {
        if (json.error || !json.schedule) {
          setData(generateFallbackSchedule())
        } else {
          setData(json)
        }
      })
      .catch(() => {
        setData(generateFallbackSchedule())
      })
      .finally(() => setLoading(false))
  }, [])

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}`
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Agenda da Semana
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {formatDate(data.weekStart)} a {formatDate(data.weekEnd)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {data?.schedule.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-xl border p-4 transition-all ${
                slot.isAvailable
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {slot.dayName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(slot.date)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {slot.startTime}
                </div>
              </div>

              {slot.isAvailable ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Horário disponível
                  </span>
                  <Link
                    href="/#booking"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Agendar
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {slot.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>{booking.topic}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{booking.firstName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {(!data?.schedule || data.schedule.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum horário disponível esta semana.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground text-center">
            Quer agendar uma mentoria gratuita?{" "}
            <Link href="/" className="text-primary hover:underline font-medium">
              Acesse a página principal
            </Link>{" "}
            e preencha o formulário.
          </p>
        </div>
      </div>
    </main>
  )
}
