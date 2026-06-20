"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface TaskProgressBarProps {
  completed: number
  total: number
  className?: string
}

export function TaskProgressBar({ completed, total, className }: TaskProgressBarProps) {
  if (total === 0) return null

  const pct = Math.round((completed / total) * 100)

  const colorClass =
    pct >= 67
      ? "[&>div]:bg-emerald-500"
      : pct >= 34
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-red-500"

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {completed}/{total} concluídas
        </span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
      <Progress
        value={pct}
        className={cn("h-2.5 rounded-full", colorClass)}
        aria-label={`Progresso: ${completed} de ${total} tarefas concluídas`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
