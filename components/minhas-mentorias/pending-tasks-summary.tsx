"use client"

import { useEffect, useState } from "react"
import { CheckSquare, Square, Loader2 } from "lucide-react"
import Link from "next/link"
import { TaskProgressBar } from "./task-progress-bar"

interface PendingTask {
  taskId: string
  taskTitle: string
  taskCompleted: boolean
  bookingId: string
  topicName: string | null
  sessionDate: string | null
}

interface PendingTasksSummaryProps {
  totalTasks: number
  totalCompleted: number
}

export function PendingTasksSummary({ totalTasks, totalCompleted }: PendingTasksSummaryProps) {
  const [tasks, setTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/minhas-mentorias/tasks/pending")
      .then((r) => r.json())
      .then(({ data }) => setTasks(data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  if (totalTasks === 0 && !loading) return null

  return (
    <section aria-label="Tarefas pendentes">
      <h2 className="text-base font-semibold text-muted-foreground mb-2">
        Tarefas Pendentes
      </h2>

      <TaskProgressBar completed={totalCompleted} total={totalTasks} className="mb-3" />

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando tarefas...
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-base text-emerald-500 font-medium py-2">
          Todas as tarefas concluídas!
        </p>
      ) : (
        <ul className="flex flex-col gap-1" role="list">
          {tasks.slice(0, 5).map((task) => (
            <li key={task.taskId}>
              <Link
                href={`/minhas-mentorias/historico/${task.bookingId}`}
                className="flex items-center gap-3 rounded-lg px-3 min-h-[48px] text-base text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Square className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 truncate">{task.taskTitle}</span>
                {task.topicName && (
                  <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                    {task.topicName}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
