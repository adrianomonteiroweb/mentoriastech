"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Square,
  StickyNote,
  Trash2,
  X,
} from "lucide-react"
import { fixInfiniteAudioDuration } from "@/lib/utils/audio"

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
  sortOrder: number
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

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
]

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  for (const mime of AUDIO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return undefined
}

function stripMimeParams(mime: string): string {
  const idx = mime.indexOf(";")
  return idx >= 0 ? mime.slice(0, idx).trim() : mime
}

function extensionForMime(mime: string | undefined): string {
  if (!mime) return "webm"
  if (mime.includes("mp4")) return "m4a"
  if (mime.includes("ogg")) return "ogg"
  return "webm"
}

export function BookingTasksManager({ bookingId }: { bookingId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadTasks = useCallback(() => {
    fetch(`/api/admin/bookings/${bookingId}/tasks`)
      .then((r) => r.json())
      .then((json) => setTasks(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (res.ok) {
        setNewTitle("")
        loadTasks()
      }
    } finally {
      setAdding(false)
    }
  }

  async function toggleCompleted(task: Task) {
    await fetch(`/api/admin/bookings/${bookingId}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    })
    loadTasks()
  }

  async function deleteTaskHandler(taskId: string) {
    if (!confirm("Remover esta tarefa e todos os seus itens?")) return
    await fetch(`/api/admin/bookings/${bookingId}/tasks/${taskId}`, {
      method: "DELETE",
    })
    loadTasks()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando tarefas...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-md border border-border bg-background/50">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => toggleCompleted(task)}
              className="shrink-0"
            >
              {task.completed ? (
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
              <span className="text-[10px] text-muted-foreground">
                {task.items.length} item{task.items.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
              className="p-0.5 text-muted-foreground hover:text-foreground"
            >
              {expandedId === task.id ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => deleteTaskHandler(task.id)}
              className="p-0.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {expandedId === task.id && (
            <TaskItemsPanel
              bookingId={bookingId}
              taskId={task.id}
              items={task.items}
              onRefresh={loadTasks}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="Nova tarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="sm"
          onClick={addTask}
          disabled={adding || !newTitle.trim()}
          className="h-8 text-xs shrink-0"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function TaskItemsPanel({
  bookingId,
  taskId,
  items,
  onRefresh,
}: {
  bookingId: string
  taskId: string
  items: TaskItem[]
  onRefresh: () => void
}) {
  const [mode, setMode] = useState<null | "comment" | "file" | "audio">(null)

  async function deleteItem(itemId: string) {
    await fetch(
      `/api/admin/bookings/${bookingId}/tasks/${taskId}/items/${itemId}`,
      { method: "DELETE" },
    )
    onRefresh()
  }

  return (
    <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 rounded-md bg-secondary/30 px-2.5 py-1.5">
          <div className="mt-0.5">
            {item.type === "comment" && <MessageSquare className="h-3.5 w-3.5 text-amber-500" />}
            {item.type === "audio" && <Mic className="h-3.5 w-3.5 text-green-500" />}
            {item.type === "file" && <Paperclip className="h-3.5 w-3.5 text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            {item.title && <p className="text-xs font-medium truncate">{item.title}</p>}
            {item.type === "comment" && item.content && (
              <p className="text-xs text-foreground whitespace-pre-wrap">{item.content}</p>
            )}
            {item.type === "audio" && item.fileUrl && (
              <div className="flex flex-col gap-1 mt-1">
                {item.durationSeconds != null && (
                  <span className="text-[10px] text-muted-foreground">
                    Duracao: {formatDuration(item.durationSeconds)}
                  </span>
                )}
                <audio
                  controls
                  className="w-full h-7"
                  preload="metadata"
                  onLoadedMetadata={(e) => fixInfiniteAudioDuration(e.currentTarget)}
                >
                  <source src={item.fileUrl} type={item.mimeType || "audio/webm"} />
                </audio>
              </div>
            )}
            {item.type === "file" && item.fileSizeBytes && (
              <span className="text-[10px] text-muted-foreground">{formatBytes(item.fileSizeBytes)}</span>
            )}
          </div>
          {item.fileUrl && item.type === "file" && (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:bg-primary/20 shrink-0"
            >
              <Download className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => deleteItem(item.id)}
            className="p-0.5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}

      {mode === null && (
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("comment")}
            className="h-7 text-[10px] px-2"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Comentario
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("file")}
            className="h-7 text-[10px] px-2"
          >
            <FileUp className="h-3 w-3 mr-1" />
            Arquivo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("audio")}
            className="h-7 text-[10px] px-2"
          >
            <Mic className="h-3 w-3 mr-1 text-green-500" />
            Audio
          </Button>
        </div>
      )}

      {mode === "comment" && (
        <CommentForm
          bookingId={bookingId}
          taskId={taskId}
          onDone={() => { setMode(null); onRefresh() }}
          onCancel={() => setMode(null)}
        />
      )}

      {mode === "file" && (
        <FileUploadForm
          bookingId={bookingId}
          taskId={taskId}
          onDone={() => { setMode(null); onRefresh() }}
          onCancel={() => setMode(null)}
        />
      )}

      {mode === "audio" && (
        <TaskAudioRecorder
          bookingId={bookingId}
          taskId={taskId}
          onDone={() => { setMode(null); onRefresh() }}
          onCancel={() => setMode(null)}
        />
      )}
    </div>
  )
}

function CommentForm({
  bookingId,
  taskId,
  onDone,
  onCancel,
}: {
  bookingId: string
  taskId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/admin/bookings/${bookingId}/tasks/${taskId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", content: content.trim() }),
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium">Novo comentario</p>
        <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva um comentario..."
        className="min-h-16 text-xs"
      />
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={saving || !content.trim()}
        className="h-7 text-xs w-fit"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Salvar
      </Button>
    </div>
  )
}

function FileUploadForm({
  bookingId,
  taskId,
  onDone,
  onCancel,
}: {
  bookingId: string
  taskId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")

    const form = new FormData()
    form.append("file", file)
    form.append("title", file.name)
    form.append("type", "file")

    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/tasks/${taskId}/items`,
        { method: "POST", body: form },
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar")
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium">Enviar arquivo</p>
        <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      {uploading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Enviando...
        </div>
      ) : (
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
          onChange={handleFile}
          className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground"
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function TaskAudioRecorder({
  bookingId,
  taskId,
  onDone,
  onCancel,
}: {
  bookingId: string
  taskId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "uploading">("idle")
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const detectedMimeRef = useRef<string | undefined>(undefined)

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
  }

  async function startRecording() {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = getSupportedMimeType()
      detectedMimeRef.current = mime
      const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {}
      const recorder = new MediaRecorder(stream, opts)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blobType = stripMimeParams(detectedMimeRef.current || "audio/webm")
        const blob = new Blob(chunksRef.current, { type: blobType })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState("recorded")
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start(1000)
      startTimeRef.current = Date.now()
      setState("recording")
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 500)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Permissao de microfone negada.")
      } else {
        setError("Erro ao iniciar gravacao.")
      }
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function discard() {
    cleanup()
    setAudioUrl(null)
    setElapsed(0)
    setState("idle")
  }

  async function upload() {
    if (!chunksRef.current.length) {
      setError("Nenhum audio capturado.")
      return
    }
    setState("uploading")
    setError("")

    const mime = stripMimeParams(detectedMimeRef.current || "audio/webm")
    const ext = extensionForMime(detectedMimeRef.current)
    const blob = new Blob(chunksRef.current, { type: mime })
    const now = new Date()
    const title = `Gravacao ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    const file = new File([blob], `${title}.${ext}`, { type: mime })

    const form = new FormData()
    form.append("file", file)
    form.append("title", title)
    form.append("type", "audio")
    form.append("duration_seconds", String(elapsed))

    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/tasks/${taskId}/items`,
        { method: "POST", body: form },
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar audio")
      }
      cleanup()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
      setState("recorded")
    }
  }

  const mm = Math.floor(elapsed / 60)
  const ss = elapsed % 60
  const timerDisplay = `${mm}:${ss.toString().padStart(2, "0")}`

  return (
    <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2 grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium">Gravar audio</p>
        <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { cleanup(); onCancel() }}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {state === "idle" && (
        <Button type="button" size="sm" variant="outline" onClick={startRecording} className="text-[10px] h-7 w-fit">
          <Mic className="h-3 w-3 mr-1 text-green-500" />
          Iniciar gravacao
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-medium tabular-nums">{timerDisplay}</span>
          <Button type="button" size="sm" variant="destructive" onClick={stopRecording} className="text-[10px] h-6">
            <MicOff className="h-3 w-3 mr-1" />
            Parar
          </Button>
        </div>
      )}

      {state === "recorded" && audioUrl && (
        <div className="grid gap-1.5">
          <audio
            controls
            className="w-full h-7"
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => fixInfiniteAudioDuration(e.currentTarget)}
          />
          <p className="text-[10px] text-muted-foreground">Duracao: {timerDisplay}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={discard} className="text-[10px] h-6">
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={upload} className="text-[10px] h-6">
              Enviar audio
            </Button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando audio...
        </div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
