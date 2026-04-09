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

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
        } else {
          setData(json)
        }
      })
      .catch(() => setError("Erro ao carregar a agenda"))
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

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-sm text-destructive">{error}</p>
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
                    Horario disponivel
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
              Nenhum horario disponivel esta semana.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground text-center">
            Quer agendar uma mentoria gratuita?{" "}
            <Link href="/" className="text-primary hover:underline font-medium">
              Acesse a pagina principal
            </Link>{" "}
            e preencha o formulario.
          </p>
        </div>
      </div>
    </main>
  )
}
