"use client"

import {
  AlertTriangle,
  CalendarCheck,
  Clock,
  Gift,
  MessageCircle,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "./empty-state"
import { useOpportunities } from "./opportunities-context"
import type { TodayAction } from "./types"

const URGENCY_STYLES = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-blue-500",
}

const TYPE_ICONS = {
  interview_soon: CalendarCheck,
  recruiter_waiting: MessageCircle,
  offer_received: Gift,
  overdue_followup: Clock,
  resume_almost_ready: FileText,
  stale_opportunity: AlertTriangle,
}

function ActionCard({ action, isFirst }: { action: TodayAction; isFirst: boolean }) {
  const { dispatch } = useOpportunities()

  const Icon = TYPE_ICONS[action.type] || AlertTriangle

  return (
    <Card
      className={`border-l-4 ${URGENCY_STYLES[action.urgency]} cursor-pointer transition-colors hover:border-primary/40`}
      onClick={() => dispatch({ type: "SELECT", id: action.opportunity.id })}
    >
      <CardContent className={`flex flex-col gap-2 ${isFirst ? "py-5" : "py-3"}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${isFirst ? "bg-primary/10" : "bg-secondary"}`}>
            <Icon className={`${isFirst ? "h-5 w-5 text-primary" : "h-4 w-4 text-muted-foreground"}`} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className={`font-semibold text-foreground ${isFirst ? "text-base" : "text-sm"}`}>
              {action.title}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {action.subtitle}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pl-11">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: "SELECT", id: action.opportunity.id })
            }}
          >
            Ver detalhes
          </Button>
          {action.type === "overdue_followup" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              Marcar como feito
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TodayView() {
  const { state } = useOpportunities()
  const actions = state.todayActions

  if (actions.length === 0) {
    return <EmptyState view="hoje" />
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Voce tem <strong className="text-foreground">{actions.length}</strong>{" "}
        {actions.length === 1 ? "acao importante" : "acoes importantes"} hoje:
      </p>
      {actions.map((action, i) => (
        <ActionCard key={action.id} action={action} isFirst={i === 0} />
      ))}
    </div>
  )
}
