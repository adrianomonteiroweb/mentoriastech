"use client"

import { CalendarDays, Target, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SimSprintApi } from "@/lib/types/database"

const STATUS_LABELS: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
}

/**
 * Header fixo do hub: título, "Dia X de N" (fresh-start), barra de progresso
 * (goal-gradient) e pontuação — status sempre visível, em texto.
 */
export function SprintHeader({ sprint }: { sprint: SimSprintApi }) {
  const done = sprint.done_count ?? 0
  const total = sprint.task_count ?? 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <header className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-foreground">
            {sprint.title}
          </h1>
          {sprint.objective && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
              <Target className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {sprint.objective}
            </p>
          )}
        </div>
        <Badge
          variant={sprint.status === "active" ? "default" : "outline"}
          className="shrink-0"
        >
          {STATUS_LABELS[sprint.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Dia {sprint.current_day} de {sprint.duration_days}
        </p>
        <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xl tabular-nums">{sprint.total_score ?? 0}</span>
          <span className="text-sm font-normal text-muted-foreground">pontos</span>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso das tasks</span>
          <span className="font-medium text-foreground tabular-nums">
            {done}/{total} concluídas
          </span>
        </div>
        <Progress
          value={progress}
          aria-label={`Progresso: ${done} de ${total} tasks concluídas`}
        />
      </div>
    </header>
  )
}
