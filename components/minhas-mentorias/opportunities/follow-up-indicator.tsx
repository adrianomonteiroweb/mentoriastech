"use client"

import { Clock } from "lucide-react"

interface Props {
  dueDate: string | null
}

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function FollowUpIndicator({ dueDate }: Props) {
  if (!dueDate) return null

  const days = daysDiff(dueDate)

  if (days > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
        <Clock className="h-3 w-3" />
        Ha {days}d
      </span>
    )
  }

  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
        <Clock className="h-3 w-3" />
        Hoje
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Clock className="h-3 w-3" />
      Em {Math.abs(days)}d
    </span>
  )
}
