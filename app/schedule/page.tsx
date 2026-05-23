"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Clock,
  User,
  BookOpen,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const SCHEDULE_WEEKS = 16

interface SlotBooking {
  id: string
  topic: string
  firstName: string
  status: string
}

interface ScheduleSlot {
  id: string
  slotId?: string
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

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  return d.toISOString().split("T")[0]
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

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

  for (let week = 0; week < SCHEDULE_WEEKS; week++) {
    for (const entry of SCHEDULE_TEMPLATE) {
      const daysToAdd = ((entry.day - 1 + 7) % 7) + week * 7
      const date = new Date(monday)
      date.setDate(monday.getDate() + daysToAdd)
      const dateStr = date.toISOString().split("T")[0]

      for (const time of entry.times) {
        if (week === 0 && entry.day === currentDay) {
          const [h, m] = time.split(":").map(Number)
          const isPast = currentHour > h || (currentHour === h && currentMinute >= m)
          if (isPast) continue
        }

        slots.push({
          id: `fallback-${week}-${entry.day}-${time}`,
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
  }

  slots.sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
  )

  return {
    schedule: slots,
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  }
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}`
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeWeek, setActiveWeek] = useState<string | null>(null)

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

  const weeks = useMemo(() => {
    if (!data) return [] as { key: string; slots: ScheduleSlot[] }[]

    const map = new Map<string, ScheduleSlot[]>()
    for (const slot of data.schedule) {
      const key = mondayOf(slot.date)
      const list = map.get(key) || []
      list.push(slot)
      map.set(key, list)
    }

    return Array.from(map.entries())
      .map(([key, slots]) => ({
        key,
        slots: slots.sort((a, b) =>
          a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
        ),
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [data])

  useEffect(() => {
    if (!weeks.length || activeWeek) return
    const firstWithAvailable = weeks.find((w) => w.slots.some((s) => s.isAvailable))
    setActiveWeek(firstWithAvailable?.key || weeks[0].key)
  }, [weeks, activeWeek])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  const currentIdx = weeks.findIndex((w) => w.key === activeWeek)
  const currentWeek = currentIdx >= 0 ? weeks[currentIdx] : null
  const weekStart = currentWeek?.key
  const weekEnd = weekStart ? addDaysISO(weekStart, 6) : undefined

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Agenda de mentorias</h1>
          {weekStart && weekEnd && (
            <p className="text-sm text-muted-foreground">
              {formatDate(weekStart)} a {formatDate(weekEnd)}
            </p>
          )}
        </div>

        {weeks.length > 1 && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => currentIdx > 0 && setActiveWeek(weeks[currentIdx - 1].key)}
              disabled={currentIdx <= 0}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Semana anterior
            </button>
            <span className="text-xs text-muted-foreground">
              Semana {currentIdx + 1} de {weeks.length}
            </span>
            <button
              type="button"
              onClick={() =>
                currentIdx < weeks.length - 1 && setActiveWeek(weeks[currentIdx + 1].key)
              }
              disabled={currentIdx >= weeks.length - 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima semana
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {currentWeek?.slots.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-xl border p-4 transition-all ${
                slot.isAvailable ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{slot.dayName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(slot.date)}</span>
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

          {(!currentWeek || currentWeek.slots.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum horário nesta semana.
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
