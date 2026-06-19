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

function typeIcon(type: string, mimeType: string | null) {
  if (type === "note") return <StickyNote className="h-3.5 w-3.5 text-amber-500" />
  if (type === "audio") return <Mic className="h-3.5 w-3.5 text-green-500" />
  if (mimeType?.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-500" />
  return <Paperclip className="h-3.5 w-3.5 text-blue-500" />
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando materiais...
      </div>
    )
  }

  if (!attachments || attachments.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        Materiais ({attachments.length})
      </h4>
      <div className="flex flex-col gap-2">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-2.5 rounded-md border border-border bg-background/50 px-3 py-2"
          >
            <div className="mt-0.5">{typeIcon(a.type, a.mimeType)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
              {a.fileSizeBytes && (
                <span className="text-xs text-muted-foreground">{formatBytes(a.fileSizeBytes)}</span>
              )}
              {a.type === "note" && a.content && (
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {a.content}
                </p>
              )}
              {a.type === "audio" && a.fileUrl && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {a.durationSeconds && (
                    <span className="text-xs text-muted-foreground">
                      Duracao: {formatDuration(a.durationSeconds)}
                    </span>
                  )}
                  <audio controls className="w-full h-8" preload="metadata">
                    <source src={a.fileUrl} type={a.mimeType || "audio/webm"} />
                  </audio>
                </div>
              )}
            </div>
            {a.fileUrl && a.type !== "audio" && (
              <a
                href={a.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 shrink-0"
              >
                <Download className="h-3 w-3" />
                Baixar
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
