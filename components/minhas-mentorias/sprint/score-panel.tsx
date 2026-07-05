"use client"

import { useCallback, useEffect, useState } from "react"
import { Award, Loader2, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SimScoreCategory, SimScoreEventApi } from "@/lib/types/database"

const CATEGORY_LABELS: Record<SimScoreCategory, string> = {
  structure: "Estrutura",
  code: "Código",
  tests: "Testes",
  architecture: "Arquitetura",
  communication: "Comunicação",
  general: "Geral",
  agile: "Metodologia Ágil",
}

interface ScoreData {
  total: number
  by_category: Record<string, number>
  events: SimScoreEventApi[]
}

interface Props {
  endpoint: string
  finalScore?: number | null
  finalFeedback?: string | null
}

/** Painel de pontuação: total em destaque + ledger com motivo de cada ponto. */
export function ScorePanel({ endpoint, finalScore, finalFeedback }: Props) {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(endpoint)
    const json = await res.json()
    if (res.ok) setData(json.data)
    setLoading(false)
  }, [endpoint])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando pontuação">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-6"
        aria-live="polite"
      >
        <Award className="h-8 w-8 text-primary" aria-hidden="true" />
        <p className="text-4xl font-bold tabular-nums text-foreground">
          {data.total}
        </p>
        <p className="text-base text-muted-foreground">pontos na sprint</p>
        {finalScore != null && (
          <Badge className="mt-2 text-sm">Nota final: {finalScore}</Badge>
        )}
      </div>

      {Object.keys(data.by_category).length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Pontos por categoria">
          {Object.entries(data.by_category).map(([category, value]) => (
            <Badge key={category} variant="outline" className="text-sm py-1.5 px-3">
              {CATEGORY_LABELS[category as SimScoreCategory] || category}:{" "}
              <span className="ml-1 tabular-nums font-semibold">
                {value > 0 ? "+" : ""}
                {value}
              </span>
            </Badge>
          ))}
        </div>
      )}

      {finalFeedback && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Feedback final do mentor
          </h3>
          <p className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {finalFeedback}
          </p>
        </div>
      )}

      <section aria-label="Histórico de pontuação" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-muted-foreground">
          Histórico
        </h3>
        {data.events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-base text-muted-foreground">
            Nenhum ponto ainda. Complete tasks e participe da daily para
            pontuar!
          </p>
        ) : (
          data.events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span
                className={`flex h-9 w-14 shrink-0 items-center justify-center gap-0.5 rounded-full text-sm font-bold tabular-nums ${
                  event.delta > 0
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {event.delta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {event.delta > 0 ? "+" : ""}
                {event.delta}
              </span>
              <div className="min-w-0">
                <p className="text-base text-foreground leading-snug">
                  {event.reason}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dia {event.sprint_day} ·{" "}
                  {CATEGORY_LABELS[event.category] || event.category} ·{" "}
                  {event.source === "auto" ? "Avaliação automática" : "Mentor"}
                </p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
