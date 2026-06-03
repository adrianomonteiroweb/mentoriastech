"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  StickyNote,
  UserCheck,
} from "lucide-react"
import { EVENT_TYPE_LABELS, STAGE_MAP } from "./constants"
import type { ApiOpportunityEvent } from "./types"

const EVENT_ICONS: Record<string, typeof StickyNote> = {
  stage_change: ArrowRight,
  note: StickyNote,
  mentor_comment: UserCheck,
  follow_up: Clock,
  interview_scheduled: CalendarCheck,
  message_sent: Send,
  resume_linked: FileText,
  checklist_completed: FileText,
  application_sent: MessageCircle,
}

function formatDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatTime(d: string) {
  const date = new Date(d)
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface Props {
  opportunityId: string
}

export function Timeline({ opportunityId }: Props) {
  const [events, setEvents] = useState<ApiOpportunityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/minhas-mentorias/opportunities/${opportunityId}/events`)
      const json = await res.json()
      setEvents(json.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Nenhum evento registrado ainda.
      </p>
    )
  }

  return (
    <div className="relative flex flex-col gap-0">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.event_type] || StickyNote
        const isMentor = event.event_type === "mentor_comment"

        return (
          <div key={event.id} className="relative flex gap-3 pb-4">
            {/* Dot */}
            <div className={`relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full border flex-shrink-0 ${
              isMentor
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}>
              <Icon className={`h-3 w-3 ${isMentor ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium ${isMentor ? "text-primary" : "text-foreground"}`}>
                  {event.title || EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(event.occurred_at)} {formatTime(event.occurred_at)}
                </span>
              </div>

              {/* Stage change details */}
              {event.event_type === "stage_change" && event.from_status && event.to_status && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{STAGE_MAP[event.from_status as keyof typeof STAGE_MAP]?.label || event.from_status}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span>{STAGE_MAP[event.to_status as keyof typeof STAGE_MAP]?.label || event.to_status}</span>
                </div>
              )}

              {/* Body */}
              {event.body && (
                <p className={`text-xs leading-relaxed whitespace-pre-wrap mt-0.5 ${
                  isMentor
                    ? "rounded-md border border-primary/20 bg-primary/5 p-2 text-foreground"
                    : "text-muted-foreground"
                }`}>
                  {event.body}
                </p>
              )}

              {/* Mentor name */}
              {isMentor && event.author_name && (
                <span className="text-[10px] text-primary mt-0.5">
                  — {event.author_name}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
