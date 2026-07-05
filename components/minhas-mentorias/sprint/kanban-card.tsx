"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { ArrowRightLeft, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SIM_TASK_STATUS_LABELS,
  type SimTaskStatus as TransitionStatus,
} from "@/lib/sim/task-transitions"
import type { SimSprintTaskApi, SimTaskStatus } from "@/lib/types/database"

export const TASK_TYPE_LABELS: Record<string, string> = {
  feature: "Feature",
  bug: "Bug",
  refactor: "Refatoração",
  architecture: "Arquitetura",
  increment: "Incremento",
}

interface Props {
  task: SimSprintTaskApi
  allowedTargets: TransitionStatus[]
  disabled?: boolean
  onMove: (taskId: string, toStatus: SimTaskStatus) => void
  onOpen: (task: SimSprintTaskApi) => void
}

/**
 * Card do kanban. Interação primária = menu "Mover" (teclado, leitor de
 * tela e toque); arrastar é só uma melhoria progressiva.
 */
export function KanbanCard({
  task,
  allowedTargets,
  disabled,
  onMove,
  onOpen,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: disabled || allowedTargets.length === 0,
    })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`rounded-lg border border-border bg-card p-3 flex flex-col gap-2 ${
        isDragging ? "opacity-60 ring-2 ring-primary z-10 relative" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded min-h-[44px]"
        aria-label={`Task ${task.task_number}: ${task.title}. Ver detalhes`}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Task #{task.task_number}
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">
          {task.title}
        </p>
      </button>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="outline" className="text-[10px] shrink-0">
            {TASK_TYPE_LABELS[task.task_type]}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {task.points} pts
          </span>
        </div>

        <div className="flex items-center">
          {!disabled && allowedTargets.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs"
                    aria-label={`Mover Task ${task.task_number}`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    Mover
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                  {allowedTargets.map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onClick={() => onMove(task.id, target)}
                      className="min-h-[40px]"
                    >
                      {SIM_TASK_STATUS_LABELS[target]}
                      {target === "review" && " (enviar p/ revisão)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <span
                {...listeners}
                {...attributes}
                className="hidden md:flex h-9 w-6 items-center justify-center cursor-grab text-muted-foreground touch-none"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
