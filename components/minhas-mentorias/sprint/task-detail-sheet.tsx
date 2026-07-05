"use client"

import { ArrowRightLeft, Code2, RefreshCw, Send, ShieldCheck } from "lucide-react"
import { EvaluationChecklist } from "./evaluation-checklist"
import { SimMarkdown } from "./sim-markdown"
import { TASK_TYPE_LABELS } from "./kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  SIM_TASK_STATUS_LABELS,
  getAllowedTransitions,
  type SimActorRole,
} from "@/lib/sim/task-transitions"
import type { SimSprintTaskApi, SimTaskStatus } from "@/lib/types/database"

interface Props {
  task: SimSprintTaskApi | null
  role: SimActorRole
  disabled?: boolean
  onClose: () => void
  onMove: (taskId: string, toStatus: SimTaskStatus) => void
  /** Mentor: reexecuta a avaliação automática da task */
  onReevaluate?: (taskId: string) => void
  /** Mentee: abre a IDE de execução para a task */
  onEnterIde?: (task: SimSprintTaskApi) => void
}

/** Detalhe da task: critérios em markdown + ações de movimentação (sem trocar de página). */
export function TaskDetailSheet({
  task,
  role,
  disabled,
  onClose,
  onMove,
  onReevaluate,
  onEnterIde,
}: Props) {
  const allowedTargets = task
    ? getAllowedTransitions(role, task.status)
    : []

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto md:max-w-lg md:mx-auto rounded-t-xl">
        {task && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg">
                Task #{task.task_number} — {task.title}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TASK_TYPE_LABELS[task.task_type]}</Badge>
                  <Badge variant={task.status === "done" ? "default" : "secondary"}>
                    {SIM_TASK_STATUS_LABELS[task.status]}
                  </Badge>
                  <span className="text-sm tabular-nums">{task.points} pontos</span>
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="py-4">
              {task.description ? (
                <SimMarkdown markdown={task.description} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem descrição — pergunte ao Tech Lead na Daily.
                </p>
              )}
            </div>

            {onEnterIde && (
              <Button
                className="mb-4 min-h-[48px] w-full"
                onClick={() => onEnterIde(task)}
              >
                <Code2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Abrir na IDE
              </Button>
            )}

            {task.has_rules && !task.last_evaluation && (
              <p className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Esta task tem avaliação automática: ao enviar para revisão, seu
                workspace será verificado e você recebe o resultado na hora.
              </p>
            )}

            {task.last_evaluation && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Última avaliação automática
                  </h3>
                  {role === "mentor" && onReevaluate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onReevaluate(task.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                      Reavaliar
                    </Button>
                  )}
                </div>
                <EvaluationChecklist evaluation={task.last_evaluation} />
              </div>
            )}

            {role === "mentor" && onReevaluate && task.has_rules && !task.last_evaluation && (
              <Button
                variant="outline"
                size="sm"
                className="mb-4 self-start"
                onClick={() => onReevaluate(task.id)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Executar avaliação automática
              </Button>
            )}

            {!disabled && allowedTargets.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Mover task para:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowedTargets.map((target) => (
                    <Button
                      key={target}
                      variant={target === "review" ? "default" : "outline"}
                      className="min-h-[48px]"
                      onClick={() => onMove(task.id, target)}
                    >
                      {target === "review" ? (
                        <Send className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      )}
                      {target === "review" && role === "mentee"
                        ? "Enviar para revisão"
                        : SIM_TASK_STATUS_LABELS[target]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
