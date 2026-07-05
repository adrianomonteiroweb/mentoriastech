"use client"

import { useEffect, useMemo, useState } from "react"
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { Lightbulb } from "lucide-react"
import { KanbanCard } from "./kanban-card"
import { TaskDetailSheet } from "./task-detail-sheet"
import { ConceptTip } from "./concept-tip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  SIM_TASK_STATUSES,
  SIM_TASK_STATUS_LABELS,
  getAllowedTransitions,
  type SimActorRole,
} from "@/lib/sim/task-transitions"
import type { SimSprintTaskApi, SimTaskStatus } from "@/lib/types/database"

/** Explicação de cada coluna do Kanban (ensina o fluxo a quem não conhece SCRUM). */
const COLUMN_TIPS: Record<SimTaskStatus, string> = {
  backlog: "Tudo que pode ser feito, ainda não priorizado para agora.",
  todo: "Priorizado para esta sprint e pronto para você começar.",
  doing: "Em andamento agora. Mantenha só 1 task aqui — é o WIP limit, que garante foco.",
  review: "Entregue para revisão: a avaliação automática roda e o Tech Lead confere.",
  done: "Concluída e aprovada pelo Tech Lead. Cada Done te aproxima da meta da sprint.",
}

interface Props {
  tasks: SimSprintTaskApi[]
  role: SimActorRole
  disabled?: boolean
  onMove: (taskId: string, toStatus: SimTaskStatus) => void
  /** Mentor: reexecuta a avaliação automática (repassado ao detalhe da task) */
  onReevaluate?: (taskId: string) => void
  /** Mentee: abre a IDE de execução para a task (só quando disponível). */
  onEnterIde?: (task: SimSprintTaskApi) => void
  /** Mentor: salva/edita o gabarito e libera/oculta para o mentorado. */
  onSolutionChange?: (
    taskId: string,
    patch: { solution_markdown?: string; solution_released?: boolean },
  ) => Promise<void>
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: SimTaskStatus
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${SIM_TASK_STATUS_LABELS[status]}, ${count} tasks`}
      className={`flex w-[260px] shrink-0 snap-start flex-col gap-2 rounded-xl border p-3 md:w-auto md:shrink ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
      }`}
    >
      <h3 className="flex items-center justify-between text-sm font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          {SIM_TASK_STATUS_LABELS[status]}
          <ConceptTip title={SIM_TASK_STATUS_LABELS[status]}>
            {COLUMN_TIPS[status]}
          </ConceptTip>
        </span>
        <span
          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground tabular-nums"
          aria-hidden="true"
        >
          {count}
        </span>
      </h3>
      {children}
    </section>
  )
}

export function SprintKanban({
  tasks,
  role,
  disabled,
  onMove,
  onReevaluate,
  onEnterIde,
  onSolutionChange,
}: Props) {
  const [announcement, setAnnouncement] = useState("")
  const [selectedTask, setSelectedTask] = useState<SimSprintTaskApi | null>(null)
  const [confirmReview, setConfirmReview] = useState<{
    taskId: string
    taskNumber: number
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  // Mantém o detalhe aberto em sincronia após reload (ex.: salvar/liberar gabarito).
  useEffect(() => {
    setSelectedTask((current) =>
      current ? (tasks.find((t) => t.id === current.id) ?? current) : current,
    )
  }, [tasks])

  const byStatus = useMemo(() => {
    const map = new Map<SimTaskStatus, SimSprintTaskApi[]>()
    for (const status of SIM_TASK_STATUSES) map.set(status, [])
    for (const task of tasks) map.get(task.status)?.push(task)
    return map
  }, [tasks])

  const doingCount = byStatus.get("doing")?.length ?? 0

  function requestMove(taskId: string, toStatus: SimTaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Enviar para review pede confirmação (feedback loop consciente)
    if (toStatus === "review" && role === "mentee") {
      setConfirmReview({ taskId, taskNumber: task.task_number })
      return
    }

    executeMove(taskId, toStatus)
  }

  function executeMove(taskId: string, toStatus: SimTaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    onMove(taskId, toStatus)
    if (task) {
      setAnnouncement(
        `Task ${task.task_number} movida para ${SIM_TASK_STATUS_LABELS[toStatus]}`,
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const toStatus = over.id as SimTaskStatus
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === toStatus) return
    if (!getAllowedTransitions(role, task.status).includes(toStatus)) {
      setAnnouncement(
        `Movimento não permitido para ${SIM_TASK_STATUS_LABELS[toStatus]}`,
      )
      return
    }
    requestMove(String(active.id), toStatus)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Anúncio para leitores de tela */}
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      {doingCount > 1 && (
        <p className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Dica do Tech Lead: foque em 1 task por vez — termine antes de puxar
            a próxima.
          </span>
          <ConceptTip title="WIP limit" className="text-yellow-600 dark:text-yellow-400">
            WIP = Work In Progress (trabalho em andamento). Limitar quantas tasks
            você toca ao mesmo tempo reduz retrabalho e faz o time entregar mais
            rápido.
          </ConceptTip>
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible"
          role="list"
          aria-label="Quadro kanban da sprint"
        >
          {SIM_TASK_STATUSES.map((status) => {
            const columnTasks = byStatus.get(status) ?? []
            return (
              <KanbanColumn
                key={status}
                status={status}
                count={columnTasks.length}
              >
                {columnTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Nenhuma task
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      allowedTargets={getAllowedTransitions(role, task.status)}
                      disabled={disabled}
                      role={role}
                      onMove={requestMove}
                      onOpen={setSelectedTask}
                      onEnterIde={onEnterIde}
                    />
                  ))
                )}
              </KanbanColumn>
            )
          })}
        </div>
      </DndContext>

      <TaskDetailSheet
        task={selectedTask}
        role={role}
        disabled={disabled}
        onClose={() => setSelectedTask(null)}
        onMove={(taskId, toStatus) => {
          setSelectedTask(null)
          requestMove(taskId, toStatus)
        }}
        onEnterIde={
          onEnterIde
            ? (task) => {
                setSelectedTask(null)
                onEnterIde(task)
              }
            : undefined
        }
        onReevaluate={
          onReevaluate
            ? (taskId) => {
                setSelectedTask(null)
                onReevaluate(taskId)
              }
            : undefined
        }
        onSolutionChange={onSolutionChange}
      />

      <AlertDialog
        open={Boolean(confirmReview)}
        onOpenChange={(open) => {
          if (!open) setConfirmReview(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Enviar Task #{confirmReview?.taskNumber} para revisão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O Tech Lead vai revisar sua entrega. Depois de enviada, só ele
              pode aprovar ou devolver a task para ajustes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ainda não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReview) executeMove(confirmReview.taskId, "review")
                setConfirmReview(null)
              }}
            >
              Enviar para revisão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
