"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Loader2, Mic, Paperclip, StickyNote } from "lucide-react"

interface Attachment {
  id: string
  type: "file" | "note" | "audio"
  title: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileSizeBytes: number | null
  mimeType: string | null
  durationSeconds: number | null
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

function TypeIcon({ type, mimeType }: { type: string; mimeType: string | null }) {
  if (type === "note") return <StickyNote className="h-5 w-5 text-amber-500" aria-hidden="true" />
  if (type === "audio") return <Mic className="h-5 w-5 text-green-500" aria-hidden="true" />
  if (mimeType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" aria-hidden="true" />
  return <Paperclip className="h-5 w-5 text-blue-500" aria-hidden="true" />
}

export function BookingAttachmentsView({ bookingId }: { bookingId: string }) {
  const [attachments, setAttachments] = useState<Attachment[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/minhas-mentorias/bookings/${bookingId}/attachments`)
      .then((r) => r.json())
      .then((json) => setAttachments(json.data || []))
      .catch(() => setAttachments([]))
      .finally(() => setLoading(false))
  }, [bookingId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-base text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando materiais...
      </div>
    )
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="py-8 text-center">
        <Paperclip className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
        <p className="text-base text-muted-foreground">
          Nenhum documento anexado a esta sessão.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Materiais e documentos">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Materiais ({attachments.length})
      </h4>
      {attachments.map((a) => (
        <div
          key={a.id}
          role="listitem"
          className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3"
        >
          <div className="mt-0.5 shrink-0">
            <TypeIcon type={a.type} mimeType={a.mimeType} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-foreground truncate">{a.title}</p>
            {a.fileSizeBytes && (
              <span className="text-sm text-muted-foreground">{formatBytes(a.fileSizeBytes)}</span>
            )}
            {a.type === "note" && a.content && (
              <p className="mt-1.5 text-base text-foreground whitespace-pre-wrap leading-relaxed">
                {a.content}
              </p>
            )}
            {a.type === "audio" && a.fileUrl && (
              <div className="mt-2 flex flex-col gap-1">
                {a.durationSeconds && (
                  <span className="text-sm text-muted-foreground">
                    Duração: {formatDuration(a.durationSeconds)}
                  </span>
                )}
                <audio controls className="w-full h-10" preload="metadata">
                  <source src={a.fileUrl} type={a.mimeType || "audio/webm"} />
                  Seu navegador não suporta áudio.
                </audio>
              </div>
            )}
          </div>
          {a.fileUrl && a.type !== "audio" && (
            <a
              href={a.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 min-h-[44px] text-sm font-medium text-primary hover:bg-primary/20 shrink-0 transition-colors"
              aria-label={`Baixar ${a.title}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
