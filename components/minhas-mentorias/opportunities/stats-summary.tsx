"use client"

import { Briefcase, CalendarCheck, MessageCircle, AlertCircle } from "lucide-react"
import type { WeeklyStats } from "./types"

interface Props {
  stats: WeeklyStats | null
}

const ITEMS = [
  { key: "applications_sent" as const, label: "Enviadas", icon: Briefcase },
  { key: "interviews_scheduled" as const, label: "Entrevistas", icon: CalendarCheck },
  { key: "responses_received" as const, label: "Respostas", icon: MessageCircle },
  { key: "pending_actions" as const, label: "Pendentes", icon: AlertCircle },
]

export function StatsSummary({ stats }: Props) {
  if (!stats) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const value = stats[item.key]
        return (
          <div
            key={item.key}
            className="flex min-w-[100px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
          >
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground leading-tight">
                {value}
              </span>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
