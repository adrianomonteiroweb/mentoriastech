"use client"

import { useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FINALIZATION_LABELS, STAGES } from "./constants"
import { useOpportunities } from "./opportunities-context"
import type { OpportunityStatus } from "./types"

interface Props {
  opportunityId: string
  currentStage: OpportunityStatus
  compact?: boolean
}

export function MoveStageDropdown({ opportunityId, currentStage, compact }: Props) {
  const { moveToStage } = useOpportunities()
  const [moving, setMoving] = useState(false)

  async function handleMove(toStatus: OpportunityStatus, finalizationType?: string) {
    setMoving(true)
    try {
      await moveToStage(opportunityId, toStatus, finalizationType)
    } catch {
      // Context handles error
    } finally {
      setMoving(false)
    }
  }

  const availableStages = STAGES.filter((s) => s.key !== currentStage && s.key !== "finalized")
  const finalizationOptions = Object.entries(FINALIZATION_LABELS)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={moving}
          className={compact ? "h-7 text-xs px-2" : ""}
        >
          {moving ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <ChevronDown className="h-3 w-3 mr-1" />
          )}
          Mover para
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStages.map((stage) => (
          <DropdownMenuItem
            key={stage.key}
            onClick={() => handleMove(stage.key)}
          >
            <span className={`mr-2 h-2 w-2 rounded-full ${stage.color.replace("text-", "bg-")}`} />
            {stage.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {finalizationOptions.map(([key, label]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleMove("finalized", key)}
            className="text-muted-foreground"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
