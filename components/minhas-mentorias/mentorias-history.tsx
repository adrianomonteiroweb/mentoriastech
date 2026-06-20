"use client"

import { AlertTriangle } from "lucide-react"
import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { NextSessionCard, NoUpcomingSession } from "@/components/minhas-mentorias/next-session-card"
import { PendingTasksSummary } from "@/components/minhas-mentorias/pending-tasks-summary"
import { SessionTimelineCard } from "@/components/minhas-mentorias/session-timeline-card"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"
import type { BookingStatus } from "@/lib/types/database"

interface Props {
  email: string
  bookings: MenteeBookingItem[]
}

function isUpcoming(b: MenteeBookingItem): boolean {
  if (!b.sessionDate) return false
  const s = b.status as BookingStatus
  if (s === "completed" || s === "cancelled") return false
  const d = new Date(b.sessionDate + "T23:59:59")
  return d >= new Date()
}

function groupByMonth(bookings: MenteeBookingItem[]) {
  const groups = new Map<string, MenteeBookingItem[]>()
  for (const b of bookings) {
    const key = b.sessionDate
      ? b.sessionDate.substring(0, 7)
      : "sem-data"
    const list = groups.get(key) || []
    list.push(b)
    groups.set(key, list)
  }
  return groups
}

function formatMonthLabel(key: string): string {
  if (key === "sem-data") return "Sem data"
  const [y, m] = key.split("-")
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

export function MentoriasHistory({ email, bookings }: Props) {
  const nextSession = bookings.find(isUpcoming)
  const pastBookings = bookings.filter((b) => b !== nextSession)
  const monthGroups = groupByMonth(pastBookings)

  const totalTasks = bookings.reduce((sum, b) => sum + b.taskCount, 0)
  const totalCompleted = bookings.reduce((sum, b) => sum + b.taskCompletedCount, 0)

  return (
    <MentoriasShell email={email}>
      <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
        {nextSession ? (
          <NextSessionCard
            id={nextSession.id}
            topicName={nextSession.topicName}
            sessionDate={nextSession.sessionDate}
            startTime={nextSession.startTime}
            status={nextSession.status as BookingStatus}
            googleMeetUrl={nextSession.googleMeetUrl}
            bookingType={nextSession.bookingType}
          />
        ) : (
          <NoUpcomingSession />
        )}

        <PendingTasksSummary
          totalTasks={totalTasks}
          totalCompleted={totalCompleted}
        />

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Como ler estas anotações</p>
            <p className="leading-relaxed">
              Trate este registro como um <strong>guia</strong>: leia com calma e
              verifique se há erros ou interpretações equivocadas. Use os botões de
              WhatsApp ou Email dentro de cada sessão para solicitar revisão ao mentor.
            </p>
          </div>
        </div>

        <section aria-label="Histórico de sessões">
          <h2 className="text-base font-semibold text-muted-foreground mb-3">
            Histórico
          </h2>

          {pastBookings.length === 0 ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-8 text-center">
              <p className="text-base text-muted-foreground">
                Você ainda não tem mentorias com anotações registradas.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Assim que o mentor concluir e registrar as anotações de uma sessão,
                ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(monthGroups.entries()).map(([month, items]) => (
                <div key={month} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatMonthLabel(month)}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {items.map((b) => (
                      <SessionTimelineCard
                        key={b.id}
                        id={b.id}
                        topicName={b.topicName}
                        sessionDate={b.sessionDate}
                        startTime={b.startTime}
                        status={b.status as BookingStatus}
                        bookingType={b.bookingType}
                        taskCount={b.taskCount}
                        taskCompletedCount={b.taskCompletedCount}
                        attachmentCount={b.attachmentCount}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MentoriasShell>
  )
}
