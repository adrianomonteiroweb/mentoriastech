"use client"

import { Badge } from "@/components/ui/badge"
import { PRIORITY_CONFIG } from "./constants"
import type { OpportunityPriority } from "./types"

interface Props {
  priority: OpportunityPriority
}

export function PriorityBadge({ priority }: Props) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <Badge variant="outline" className={`text-[10px] ${config.color} ${config.borderColor}`}>
      {config.label}
    </Badge>
  )
}
