"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Download,
  FileText,
  FileUp,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  StickyNote,
  Trash2,
  X,
} from "lucide-react"
import type { BookingAttachment } from "@/lib/db/schema"
import { fixInfiniteAudioDuration, blobToWav } from "@/lib/utils/audio"
import fixWebmDuration from "fix-webm-duration"

type ActiveMode = null | "file" | "note" | "audio"

interface Props {
  bookingId: string
  onCountChange?: (count: number) => void
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

function typeIcon(type: string, mimeType: string | null) {
  if (type === "note") return <StickyNote className="h-4 w-4 text-amber-500" />
  if (type === "audio") return <Mic className="h-4 w-4 text-green-500" />
  if (mimeType?.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />
  return <Paperclip className="h-4 w-4 text-blue-500" />
}

export function BookingAttachments({ bookingId, onCountChange }: Props) {
  const [attachments, setAttachments] = useState<BookingAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ActiveMode>(null)
  const [error, setError] = useState("")

  const onCountChangeRef = useRef(onCountChange)
  onCountChangeRef.current = onCountChange

  useEffect(() => {
    onCountChangeRef.current?.(attachments.length)
  }, [attachments])

  const fetchAttachments = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/bookings/${bookingId}/attachments`)
      .then((r) => r.json())
      .then((json) => setAttachments(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  function handleCreated() {
    setMode(null)
    setError("")
    fetchAttachments()
  }

  async function handleDelete(attachmentId: string) {
    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/attachments/${attachmentId}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao remover")
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover")
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          className="text-xs h-8"
          onClick={() => setMode(mode === "file" ? null : "file")}
        >
          <FileUp className="h-3.5 w-3.5 mr-1" />
          Arquivo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "note" ? "default" : "outline"}
          className="text-xs h-8"
          onClick={() => setMode(mode === "note" ? null : "note")}
        >
          <StickyNote className="h-3.5 w-3.5 mr-1" />
          Nota
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "audio" ? "default" : "outline"}
          className="text-xs h-8"
          onClick={() => setMode(mode === "audio" ? null : "audio")}
        >
          <Mic className="h-3.5 w-3.5 mr-1" />
          Audio
        </Button>
      </div>

      {mode === "file" && (
        <FileUploader bookingId={bookingId} onDone={handleCreated} onCancel={() => setMode(null)} />
      )}
      {mode === "note" && (
        <NoteEditor bookingId={bookingId} onDone={handleCreated} onCancel={() => setMode(null)} />
      )}
      {mode === "audio" && (
        <AudioRecorder bookingId={bookingId} onDone={handleCreated} onCancel={() => setMode(null)} />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 && !mode ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhum material adicionado.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5"
            >
              <div className="mt-0.5">{typeIcon(a.type, a.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {a.fileSizeBytes && <span>{formatBytes(a.fileSizeBytes)}</span>}
                  {a.durationSeconds && <span>{formatDuration(a.durationSeconds)}</span>}
                  <span>{new Date(a.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                {a.type === "note" && a.content && (
                  <p className="mt-1 text-xs text-foreground whitespace-pre-line line-clamp-3">
                    {a.content}
                  </p>
                )}
                {a.type === "audio" && a.fileUrl && (
                  <audio
                    controls
                    className="mt-1.5 w-full h-8"
                    preload="metadata"
                    onLoadedMetadata={(e) => fixInfiniteAudioDuration(e.currentTarget)}
                  >
                    <source src={a.fileUrl} type={a.mimeType || "audio/webm"} />
                  </audio>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {a.fileUrl && a.type !== "audio" && (
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="rounded-md p-1.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FileUploader({
  bookingId,
  onDone,
  onCancel,
}: {
  bookingId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    const title = file.name.replace(/\.[^.]+$/, "")
    const form = new FormData()
    form.append("file", file)
    form.append("title", title)
    form.append("type", "file")

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/attachments`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar arquivo")
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Enviar arquivo (PDF, DOC, imagens, TXT — max 5MB)</p>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
        onChange={handleFile}
        disabled={uploading}
        className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90"
      />
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Enviando...
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function NoteEditor({
  bookingId,
  onDone,
  onCancel,
}: {
  bookingId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Preencha titulo e conteudo da nota.")
      return
    }
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "note", title: title.trim(), content: content.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar nota")
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Nova nota</p>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Titulo</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Próximos passos"
          required
          className="h-8 text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Conteudo</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Escreva sua nota..."
          required
          className="text-xs"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="text-xs h-7">
          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Salvar nota
        </Button>
      </div>
    </div>
  )
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
  if (mime.includes("wav")) return "wav"
  if (mime.includes("mp4")) return "m4a"
  if (mime.includes("ogg")) return "ogg"
  return "webm"
}

function AudioRecorder({
  bookingId,
  onDone,
  onCancel,
}: {
  bookingId: string
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
  const fixedBlobRef = useRef<Blob | null>(null)
  const durationRef = useRef(0)

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

      recorder.onstop = async () => {
        const blobType = stripMimeParams(detectedMimeRef.current || "audio/webm")
        const rawBlob = new Blob(chunksRef.current, { type: blobType })
        // Converte p/ WAV (sempre toca, tem duração e é seekável). Se a conversão
        // falhar, mantém o WebM mas reescreve a duração no header (fallback).
        let finalBlob: Blob = rawBlob
        let durationSec = elapsed
        try {
          const wav = await blobToWav(rawBlob)
          finalBlob = wav.blob
          durationSec = Math.max(1, Math.round(wav.durationSeconds))
        } catch {
          if (blobType.includes("webm") && rawBlob.size > 0) {
            try {
              finalBlob = await fixWebmDuration(
                rawBlob,
                Math.max(0, Date.now() - startTimeRef.current),
                { logger: false },
              )
            } catch {
              finalBlob = rawBlob
            }
          }
        }
        fixedBlobRef.current = finalBlob
        durationRef.current = durationSec
        const url = URL.createObjectURL(finalBlob)
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
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Permissao de microfone negada. Habilite nas configuracoes do navegador.")
        } else if (err.name === "NotSupportedError") {
          setError("Seu navegador nao suporta gravacao de audio. Tente outro navegador.")
        } else if (err.name === "NotFoundError") {
          setError("Nenhum microfone encontrado. Conecte um microfone e tente novamente.")
        } else {
          setError(`Erro ao iniciar gravacao: ${err.message}`)
        }
      } else {
        setError("Erro ao iniciar gravacao de audio.")
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
    const blob =
      fixedBlobRef.current ??
      new Blob(chunksRef.current, { type: stripMimeParams(detectedMimeRef.current || "audio/webm") })
    if (!blob.size) {
      setError("Nenhum audio capturado. Tente gravar novamente.")
      return
    }
    setState("uploading")
    setError("")

    const mime = stripMimeParams(blob.type || "audio/webm")
    const ext = extensionForMime(mime)
    const now = new Date()
    const title = `Gravacao ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    const file = new File([blob], `${title}.${ext}`, { type: mime })

    const form = new FormData()
    form.append("file", file)
    form.append("title", title)
    form.append("type", "audio")
    form.append("duration_seconds", String(durationRef.current || elapsed))

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/attachments`, {
        method: "POST",
        body: form,
      })
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

  function handleCancel() {
    cleanup()
    onCancel()
  }

  const mm = Math.floor(elapsed / 60)
  const ss = elapsed % 60
  const timerDisplay = `${mm}:${ss.toString().padStart(2, "0")}`

  return (
    <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Gravar audio</p>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {state === "idle" && (
        <Button type="button" size="sm" variant="outline" onClick={startRecording} className="text-xs h-8 w-fit">
          <Mic className="h-3.5 w-3.5 mr-1 text-green-500" />
          Iniciar gravacao
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono font-medium tabular-nums">{timerDisplay}</span>
          <Button type="button" size="sm" variant="destructive" onClick={stopRecording} className="text-xs h-7">
            <MicOff className="h-3.5 w-3.5 mr-1" />
            Parar
          </Button>
        </div>
      )}

      {state === "recorded" && audioUrl && (
        <div className="grid gap-2">
          <audio
            controls
            className="w-full h-8"
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => fixInfiniteAudioDuration(e.currentTarget)}
          />
          <p className="text-[10px] text-muted-foreground">Duracao: {timerDisplay}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={discard} className="text-xs h-7">
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={upload} className="text-xs h-7">
              Enviar audio
            </Button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Enviando audio...
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
