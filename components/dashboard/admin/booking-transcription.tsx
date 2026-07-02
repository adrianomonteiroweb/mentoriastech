"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, FileText } from "lucide-react"
import type { AITranscriptStatus } from "@/lib/types/database"

interface MentorshipSummary {
  resumo: string
  topicos_discutidos: string
  pontos_fortes: string
  areas_desenvolvimento: string
  proximos_passos: string
}

interface BookingTranscriptionProps {
  bookingId: string
  initialStatus?: AITranscriptStatus | null
  initialSummary?: string | null
  initialTranscript?: string | null
}

const STATUS_META: Record<
  AITranscriptStatus,
  { label: string; className: string }
> = {
  pending: { label: "Na fila", className: "border-border text-muted-foreground" },
  processing: { label: "Processando…", className: "border-blue-500/40 text-blue-400" },
  done: { label: "Pronta", className: "border-green-500/40 text-green-400" },
  failed: { label: "Falhou", className: "border-destructive/40 text-destructive" },
}

const SUMMARY_SECTIONS: { key: keyof MentorshipSummary; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "topicos_discutidos", label: "Tópicos discutidos" },
  { key: "pontos_fortes", label: "Pontos fortes" },
  { key: "areas_desenvolvimento", label: "Áreas para desenvolver" },
  { key: "proximos_passos", label: "Próximos passos" },
]

function parseSummary(value: string | null | undefined): MentorshipSummary | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<MentorshipSummary>
    return {
      resumo: parsed.resumo || "",
      topicos_discutidos: parsed.topicos_discutidos || "",
      pontos_fortes: parsed.pontos_fortes || "",
      areas_desenvolvimento: parsed.areas_desenvolvimento || "",
      proximos_passos: parsed.proximos_passos || "",
    }
  } catch {
    // Conteúdo antigo ou texto puro: mostra tudo no resumo.
    return {
      resumo: value,
      topicos_discutidos: "",
      pontos_fortes: "",
      areas_desenvolvimento: "",
      proximos_passos: "",
    }
  }
}

export function BookingTranscription({
  bookingId,
  initialStatus = null,
  initialSummary = null,
  initialTranscript = null,
}: BookingTranscriptionProps) {
  const [status, setStatus] = useState<AITranscriptStatus | null>(initialStatus)
  const [summary, setSummary] = useState<MentorshipSummary | null>(
    parseSummary(initialSummary),
  )
  const [transcript, setTranscript] = useState<string | null>(initialTranscript)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const statusMeta = status ? STATUS_META[status] : null

  async function handleGenerate() {
    setLoading(true)
    setError("")
    setStatus("processing")
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/transcribe`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Erro ao gerar a transcrição")
      }
      setStatus(json.data?.status === "done" ? "done" : status)
      if (json.data?.summary) setSummary(json.data.summary as MentorshipSummary)
      if (typeof json.data?.transcript === "string") setTranscript(json.data.transcript)
    } catch (err) {
      setStatus("failed")
      setError(err instanceof Error ? err.message : "Erro ao gerar a transcrição")
    } finally {
      setLoading(false)
    }
  }

  const sections = summary
    ? SUMMARY_SECTIONS.filter((s) => summary[s.key].trim())
    : []

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            Transcrição automática (IA)
          </h4>
          {statusMeta && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          {status === "done" ? "Regenerar" : "Gerar agora"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Transcreve o áudio gravado em Materiais e gera um resumo com IA. Revise antes de
        compartilhar — pode conter erros.
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {sections.length > 0 && (
        <div className="grid gap-3">
          {sections.map((s) => (
            <div key={s.key} className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {summary![s.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      {transcript && (
        <details className="rounded-md border border-border bg-background/50 p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Transcrição completa
          </summary>
          <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {transcript}
          </p>
        </details>
      )}
    </section>
  )
}
