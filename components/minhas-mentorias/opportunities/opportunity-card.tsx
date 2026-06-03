"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  STAGE_MAP,
  WORK_MODEL_LABELS,
  JOB_LEVEL_LABELS,
  FINALIZATION_LABELS,
} from "./constants"
import { FollowUpIndicator } from "./follow-up-indicator"
import { MoveStageDropdown } from "./move-stage-dropdown"
import { useOpportunities } from "./opportunities-context"
import { PriorityBadge } from "./priority-badge"
import type { ApiOpportunity } from "./types"

interface Props {
  opportunity: ApiOpportunity
  showStage?: boolean
  compact?: boolean
}

export function OpportunityCard({ opportunity, showStage, compact }: Props) {
  const { dispatch } = useOpportunities()
  const o = opportunity
  const stage = STAGE_MAP[o.status]
  const checkedCount = o.checklist?.filter((i) => i.checked).length || 0
  const totalCount = o.checklist?.length || 0

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => dispatch({ type: "SELECT", id: o.id })}
    >
      <CardContent className={`flex flex-col gap-2 ${compact ? "py-3 px-3" : "py-4"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {o.title || "Vaga"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {o.company_name}
            </span>
          </div>
          <PriorityBadge priority={o.priority} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {showStage && stage && (
            <Badge variant="outline" className={`text-[10px] ${stage.color} ${stage.borderColor}`}>
              {stage.shortLabel}
            </Badge>
          )}
          {o.work_model && (
            <Badge variant="outline" className="text-[10px]">
              {WORK_MODEL_LABELS[o.work_model] || o.work_model}
            </Badge>
          )}
          {o.job_level && (
            <Badge variant="outline" className="text-[10px]">
              {JOB_LEVEL_LABELS[o.job_level] || o.job_level}
            </Badge>
          )}
          {o.status === "finalized" && o.finalization_type && (
            <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-500/40">
              {FINALIZATION_LABELS[o.finalization_type] || o.finalization_type}
            </Badge>
          )}
        </div>

        {/* Progress + follow-up */}
        {o.status !== "finalized" && (
          <div className="flex items-center justify-between gap-2">
            {totalCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {checkedCount}/{totalCount} passos
              </span>
            )}
            <FollowUpIndicator dueDate={o.next_follow_up_at} />
          </div>
        )}

        {/* Move button */}
        {o.status !== "finalized" && (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <MoveStageDropdown
              opportunityId={o.id}
              currentStage={o.status}
              compact
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
