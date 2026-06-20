import Link from "next/link"
import { CalendarDays, Clock, CheckSquare, Paperclip } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatusIndicator } from "./status-indicator"
import type { BookingStatus } from "@/lib/types/database"

interface SessionTimelineCardProps {
  id: string
  topicName: string | null
  sessionDate: string | null
  startTime: string | null
  status: BookingStatus
  bookingType: string
  taskCount: number
  taskCompletedCount: number
  attachmentCount: number
}

function formatDate(d: string | null) {
  if (!d) return "Sem data"
  const [y, m, day] = d.split("-")
  return `${day}/${m}`
}

function formatTime(t: string | null) {
  if (!t) return ""
  return t.substring(0, 5)
}

export function SessionTimelineCard({
  id,
  topicName,
  sessionDate,
  startTime,
  status,
  taskCount,
  taskCompletedCount,
  attachmentCount,
}: SessionTimelineCardProps) {
  return (
    <Link
      href={`/minhas-mentorias/historico/${id}`}
      className="block group"
      aria-label={`Sessão: ${topicName || "Mentoria"}, ${formatDate(sessionDate)}`}
    >
      <Card className="transition-colors group-hover:border-primary/40 group-active:scale-[0.98] transition-transform">
        <CardContent className="flex flex-col gap-2 py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {topicName || "Mentoria"}
            </h3>
            <StatusIndicator status={status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {formatDate(sessionDate)}
            </span>
            {startTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {formatTime(startTime)}
              </span>
            )}
          </div>

          {(taskCount > 0 || attachmentCount > 0) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {taskCount > 0 && (
                <span className="flex items-center gap-1.5" aria-label={`${taskCompletedCount} de ${taskCount} tarefas concluídas`}>
                  <CheckSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {taskCompletedCount}/{taskCount} tarefas
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="flex items-center gap-1.5" aria-label={`${attachmentCount} documentos`}>
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {attachmentCount} {attachmentCount === 1 ? "doc" : "docs"}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
