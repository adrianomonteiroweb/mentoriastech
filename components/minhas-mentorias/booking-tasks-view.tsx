"use client"

import { useEffect, useState } from "react"
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Square,
} from "lucide-react"
import { TaskProgressBar } from "./task-progress-bar"

interface TaskItem {
  id: string
  type: "comment" | "file" | "audio"
  title: string | null
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileSizeBytes: number | null
  mimeType: string | null
  durationSeconds: number | null
}

interface Task {
  id: string
  title: string
  completed: boolean
  items: TaskItem[]
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null) {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function BookingTasksView({ bookingId }: { bookingId: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/minhas-mentorias/bookings/${bookingId}/tasks`)
      .then((r) => r.json())
      .then((json) => setTasks(json.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [bookingId])

  async function toggleCompleted(task: Task) {
    setTogglingId(task.id)
    try {
      await fetch(`/api/minhas-mentorias/bookings/${bookingId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      })
      setTasks((prev) =>
        prev?.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t,
        ) ?? null,
      )
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-base text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando tarefas...
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
        <p className="text-base text-muted-foreground">
          Nenhuma tarefa registrada para esta sessão.
        </p>
      </div>
    )
  }

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Tarefas da sessão">
      <TaskProgressBar completed={completedCount} total={tasks.length} />

      {tasks.map((task) => (
        <div
          key={task.id}
          role="listitem"
          className="rounded-lg border border-border bg-background/50"
        >
          <div className="flex items-center gap-3 px-4 min-h-[48px]">
            <button
              type="button"
              onClick={() => toggleCompleted(task)}
              disabled={togglingId === task.id}
              className="shrink-0 p-2 -ml-2 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label={`Marcar tarefa como ${task.completed ? "pendente" : "concluída"}: ${task.title}`}
            >
              {togglingId === task.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : task.completed ? (
                <CheckSquare className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
            <span
              className={`flex-1 text-base ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {task.title}
            </span>
            {task.items.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                className="flex items-center gap-1.5 rounded-lg px-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-expanded={expandedId === task.id}
                aria-label={`${task.items.length} ${task.items.length === 1 ? "item" : "itens"} anexados`}
              >
                {task.items.length} {task.items.length === 1 ? "item" : "itens"}
                {expandedId === task.id ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {expandedId === task.id && task.items.length > 0 && (
            <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
              {task.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg bg-secondary/30 px-3 py-2.5"
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === "comment" && <MessageSquare className="h-4 w-4 text-amber-500" aria-hidden="true" />}
                    {item.type === "audio" && <Mic className="h-4 w-4 text-green-500" aria-hidden="true" />}
                    {item.type === "file" && <Paperclip className="h-4 w-4 text-blue-500" aria-hidden="true" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.title && (
                      <p className="text-sm font-medium truncate">{item.title}</p>
                    )}
                    {item.type === "comment" && item.content && (
                      <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                    )}
                    {item.type === "audio" && item.fileUrl && (
                      <div className="flex flex-col gap-1 mt-1">
                        {item.durationSeconds != null && (
                          <span className="text-sm text-muted-foreground">
                            Duração: {formatDuration(item.durationSeconds)}
                          </span>
                        )}
                        <audio controls className="w-full h-10" preload="metadata">
                          <source src={item.fileUrl} type={item.mimeType || "audio/webm"} />
                          Seu navegador não suporta áudio.
                        </audio>
                      </div>
                    )}
                    {item.type === "file" && item.fileSizeBytes && (
                      <span className="text-sm text-muted-foreground">
                        {formatBytes(item.fileSizeBytes)}
                      </span>
                    )}
                  </div>
                  {item.fileUrl && item.type !== "audio" && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 min-h-[40px] text-sm text-primary hover:bg-primary/20 shrink-0 transition-colors"
                      aria-label={`Baixar ${item.title || "arquivo"}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Baixar
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
