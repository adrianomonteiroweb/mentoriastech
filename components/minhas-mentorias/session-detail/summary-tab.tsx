import { CalendarDays, Clock, Tag, Video, ExternalLink } from "lucide-react"
import { StatusIndicator } from "@/components/minhas-mentorias/status-indicator"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"
import type { BookingStatus } from "@/lib/types/database"

interface SummaryTabProps {
  booking: MenteeBookingItem
}

function formatDate(d: string | null) {
  if (!d) return "Sem data"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function formatTime(t: string | null) {
  if (!t) return "—"
  return t.substring(0, 5)
}

const TYPE_LABELS: Record<string, string> = {
  free: "Gratuita",
  paid: "Paga",
  private: "Privada",
}

export function SummaryTab({ booking }: SummaryTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-[90px]">
            <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
            Tema
          </dt>
          <dd className="text-base font-medium text-foreground">
            {booking.topicName || "Mentoria"}
          </dd>
        </div>

        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-[90px]">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            Data
          </dt>
          <dd className="text-base text-foreground">{formatDate(booking.sessionDate)}</dd>
        </div>

        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-[90px]">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Horário
          </dt>
          <dd className="text-base text-foreground">{formatTime(booking.startTime)}</dd>
        </div>

        <div className="flex items-center gap-3">
          <dt className="text-sm text-muted-foreground min-w-[90px] pl-6">Tipo</dt>
          <dd className="text-base text-foreground">
            {TYPE_LABELS[booking.bookingType] || booking.bookingType}
          </dd>
        </div>

        <div className="flex items-center gap-3">
          <dt className="text-sm text-muted-foreground min-w-[90px] pl-6">Status</dt>
          <dd>
            <StatusIndicator status={booking.status as BookingStatus} size="md" />
          </dd>
        </div>
      </dl>

      {booking.googleMeetUrl && (
        <a
          href={booking.googleMeetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 min-h-[48px] text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Video className="h-5 w-5" aria-hidden="true" />
          Entrar no Google Meet
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}

      {booking.mentorshipChecklist && booking.mentorshipChecklist.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Checklist da Mentoria
          </h4>
          <ul className="flex flex-col gap-1.5" role="list">
            {booking.mentorshipChecklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-base text-foreground">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    item.checked
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                      : "border-border text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  {item.checked && "✓"}
                </span>
                <span className={item.checked ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
