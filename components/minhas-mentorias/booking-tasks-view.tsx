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
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando tarefas...
      </div>
    )
  }

  if (!tasks || tasks.length === 0) return null

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
        <CheckSquare className="h-3.5 w-3.5" />
        Tarefas ({completedCount}/{tasks.length})
      </h4>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-md border border-border bg-background/50"
          >
            <div className="flex items-center gap-2.5 px-3 py-2">
              <button
                type="button"
                onClick={() => toggleCompleted(task)}
                disabled={togglingId === task.id}
                className="shrink-0"
              >
                {togglingId === task.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : task.completed ? (
                  <CheckSquare className="h-4 w-4 text-green-500" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {task.title}
              </span>
              {task.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {task.items.length} item{task.items.length !== 1 ? "s" : ""}
                  {expandedId === task.id ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>

            {expandedId === task.id && task.items.length > 0 && (
              <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
                {task.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-md bg-secondary/30 px-2.5 py-1.5"
                  >
                    <div className="mt-0.5">
                      {item.type === "comment" && <MessageSquare className="h-3.5 w-3.5 text-amber-500" />}
                      {item.type === "audio" && <Mic className="h-3.5 w-3.5 text-green-500" />}
                      {item.type === "file" && <Paperclip className="h-3.5 w-3.5 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.title && (
                        <p className="text-xs font-medium truncate">{item.title}</p>
                      )}
                      {item.type === "comment" && item.content && (
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>
                      )}
                      {item.type === "audio" && item.fileUrl && (
                        <div className="flex flex-col gap-1 mt-1">
                          {item.durationSeconds != null && (
                            <span className="text-[10px] text-muted-foreground">
                              Duracao: {formatDuration(item.durationSeconds)}
                            </span>
                          )}
                          <audio controls className="w-full h-7" preload="metadata">
                            <source src={item.fileUrl} type={item.mimeType || "audio/webm"} />
                          </audio>
                        </div>
                      )}
                      {item.type === "file" && item.fileSizeBytes && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatBytes(item.fileSizeBytes)}
                        </span>
                      )}
                    </div>
                    {item.fileUrl && item.type !== "audio" && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:bg-primary/20 shrink-0"
                      >
                        <Download className="h-3 w-3" />
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
    </div>
  )
}
