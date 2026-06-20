"use client"

import { CalendarCheck, Clock, ExternalLink, Video } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatusIndicator } from "./status-indicator"
import type { BookingStatus } from "@/lib/types/database"

interface NextSessionProps {
  id: string
  topicName: string | null
  sessionDate: string | null
  startTime: string | null
  status: BookingStatus
  googleMeetUrl: string | null
  bookingType: string
}

function formatDate(d: string | null) {
  if (!d) return "Sem data"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function formatTime(t: string | null) {
  if (!t) return ""
  return t.substring(0, 5)
}

function daysUntil(d: string | null): string | null {
  if (!d) return null
  const target = new Date(d + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  if (diff < 0) return null
  return `em ${diff} dias`
}

export function NextSessionCard({
  topicName,
  sessionDate,
  startTime,
  status,
  googleMeetUrl,
  bookingType,
}: NextSessionProps) {
  const countdown = daysUntil(sessionDate)

  return (
    <section aria-label="Próxima sessão de mentoria">
      <h2 className="text-base font-semibold text-muted-foreground mb-2">
        Próxima Sessão
      </h2>
      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {topicName || "Mentoria"}
            </h3>
            <StatusIndicator status={status as BookingStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-base text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              {formatDate(sessionDate)}
            </span>
            {startTime && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                {formatTime(startTime)}
              </span>
            )}
            {countdown && (
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary">
                {countdown}
              </span>
            )}
          </div>

          {googleMeetUrl && (
            <a
              href={googleMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 min-h-[48px] text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Video className="h-5 w-5" aria-hidden="true" />
              Entrar no Google Meet
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function NoUpcomingSession() {
  return (
    <section aria-label="Nenhuma sessão agendada">
      <h2 className="text-base font-semibold text-muted-foreground mb-2">
        Próxima Sessão
      </h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarCheck className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-base text-muted-foreground">
            Nenhuma mentoria agendada no momento.
          </p>
          <a
            href="/"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 min-h-[48px] text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Agendar mentoria
          </a>
        </CardContent>
      </Card>
    </section>
  )
}
