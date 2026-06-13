"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BookingStatus, BookingWithRelations } from "@/lib/types/database"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const DEFAULT_START_HOUR = 7
const DEFAULT_END_HOUR = 22

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  payment_pending: "Aguardando pgto",
  paid: "Pago",
  scheduled: "Agendado",
  completed: "Concluido",
  cancelled: "Cancelado",
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  confirmed: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  payment_pending: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  paid: "border-green-500/30 bg-green-500/10 text-green-300",
  scheduled: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
}

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
})

const RANGE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
})

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const mondayOffset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - mondayOffset)
  return next
}

function formatTime(time: string | null) {
  return time ? time.substring(0, 5) : "--:--"
}

function bookingHour(booking: BookingWithRelations) {
  if (!booking.start_time) return null
  const hour = Number(booking.start_time.substring(0, 2))
  return Number.isFinite(hour) ? hour : null
}

function bookingMinute(booking: BookingWithRelations) {
  if (!booking.start_time) return 0
  const minute = Number(booking.start_time.substring(3, 5))
  return Number.isFinite(minute) ? minute : 0
}

function getBookingName(booking: BookingWithRelations) {
  return booking.profiles?.full_name || booking.guest_name || "Mentorado"
}

function getBookingTopic(booking: BookingWithRelations) {
  return booking.mentoring_topics?.name || "Sem tema"
}

function sortBySessionTime(a: BookingWithRelations, b: BookingWithRelations) {
  return (
    (bookingHour(a) ?? 99) * 60 +
    bookingMinute(a) -
    ((bookingHour(b) ?? 99) * 60 + bookingMinute(b))
  )
}

export function AgendaCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { mentorId, buildUrl } = useMentorFilter()

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const weekEnd = weekDays[6]
  const weekStartIso = toIsoDate(weekStart)
  const weekEndIso = toIsoDate(weekEnd)

  useEffect(() => {
    setLoading(true)
    setError("")

    fetch(buildUrl(`/api/admin/bookings?date_from=${weekStartIso}&date_to=${weekEndIso}&pageSize=200`))
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json.error || "Erro ao carregar agenda")
        }
        return json
      })
      .then((json) => setBookings(json.data || []))
      .catch((err) => {
        console.error(err)
        setBookings([])
        setError(err instanceof Error ? err.message : "Erro ao carregar agenda")
      })
      .finally(() => setLoading(false))
  }, [weekStartIso, weekEndIso, mentorId])

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingWithRelations[]>()

    for (const booking of bookings) {
      if (!booking.session_date) continue
      const current = map.get(booking.session_date) || []
      current.push(booking)
      map.set(booking.session_date, current)
    }

    for (const [key, dayBookings] of map.entries()) {
      map.set(key, [...dayBookings].sort(sortBySessionTime))
    }

    return map
  }, [bookings])

  const displayHours = useMemo(() => {
    const bookingHours = bookings
      .map(bookingHour)
      .filter((hour): hour is number => hour !== null)

    const start = Math.min(DEFAULT_START_HOUR, ...bookingHours)
    const end = Math.max(DEFAULT_END_HOUR, ...bookingHours)

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [bookings])

  function goToPreviousWeek() {
    setWeekStart((current) => addDays(current, -7))
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7))
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()))
  }

  function getBookingsForSlot(day: Date, hour: number) {
    const dayBookings = bookingsByDay.get(toIsoDate(day)) || []
    return dayBookings.filter((booking) => bookingHour(booking) === hour)
  }

  const weekLabel = `${RANGE_FORMATTER.format(weekStart)} - ${RANGE_FORMATTER.format(weekEnd)}`
  const hasBookings = bookings.length > 0

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="rounded-md border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Agenda semanal</h2>
              <p className="text-xs text-muted-foreground">{weekLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToToday}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Hoje
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-auto lg:block">
              <div className="grid min-w-[1040px] grid-cols-[72px_repeat(7,minmax(132px,1fr))]">
                <div className="border-b border-border bg-muted/30" />
                {weekDays.map((day) => {
                  const iso = toIsoDate(day)
                  const isToday = iso === toIsoDate(new Date())

                  return (
                    <div
                      key={iso}
                      className="border-b border-l border-border bg-muted/30 px-3 py-2 text-center"
                    >
                      <div className={isToday ? "text-sm font-semibold text-primary" : "text-sm font-semibold"}>
                        {DAY_FORMATTER.format(day)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {(bookingsByDay.get(iso) || []).length} agend.
                      </div>
                    </div>
                  )
                })}

                {displayHours.map((hour) => (
                  <div key={hour} className="contents">
                    <div className="border-b border-border px-2 py-2 text-right text-[11px] text-muted-foreground">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {weekDays.map((day) => {
                      const slotBookings = getBookingsForSlot(day, hour)

                      return (
                        <div
                          key={`${toIsoDate(day)}-${hour}`}
                          className="min-h-[92px] border-b border-l border-border p-1.5"
                        >
                          <div className="flex flex-col gap-1.5">
                            {slotBookings.map((booking) => (
                              <BookingPill key={booking.id} booking={booking} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {weekDays.map((day) => {
                const iso = toIsoDate(day)
                const dayBookings = bookingsByDay.get(iso) || []

                return (
                  <div key={iso} className="rounded-md border border-border p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {DAY_FORMATTER.format(day)}
                      </h3>
                      <Badge variant="outline" className="text-[10px]">
                        {dayBookings.length}
                      </Badge>
                    </div>

                    {dayBookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem agendamentos.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {dayBookings.map((booking) => (
                          <BookingPill key={booking.id} booking={booking} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!hasBookings && (
              <div className="border-t border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum agendamento nesta semana.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BookingPill({ booking }: { booking: BookingWithRelations }) {
  const requestedDate = booking.created_at ? new Date(booking.created_at) : null
  const requestedLabel =
    requestedDate && !Number.isNaN(requestedDate.getTime())
      ? requestedDate.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null

  return (
    <Link
      href={`/admin/bookings?booking_id=${booking.id}`}
      className={`block rounded-md border px-2 py-1.5 text-[11px] transition-colors hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${STATUS_COLORS[booking.status]}`}
      title="Abrir este agendamento"
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="font-semibold">{formatTime(booking.start_time)}</span>
        <span className="truncate">{STATUS_LABELS[booking.status]}</span>
      </div>
      <div className="truncate font-medium text-foreground">{getBookingName(booking)}</div>
      <div className="truncate text-muted-foreground">{getBookingTopic(booking)}</div>
      {requestedLabel && (
        <div className="mt-1 truncate text-[10px] text-muted-foreground">
          Solicitado: {requestedLabel}
        </div>
      )}
    </Link>
  )
}
