"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  Eye,
  MousePointerClick,
  Percent,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PeriodStats {
  views: number
  clicks: number
  conversion: number
}

interface AdPeriodStats {
  ad_id: string
  title: string
  is_active: boolean
  today: PeriodStats
  week: PeriodStats
  month: PeriodStats
  year: PeriodStats
  total: PeriodStats
}

interface StatsResponse {
  data: AdPeriodStats[]
  summary: Record<string, PeriodStats>
}

const PERIODS = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
  { key: "total", label: "Total" },
] as const

type PeriodKey = (typeof PERIODS)[number]["key"]

interface AdsStatsProps {
  refreshKey?: number
}

export function AdsStats({ refreshKey = 0 }: AdsStatsProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>("today")

  useEffect(() => {
    setLoading(true)
    fetch("/api/admin/ads/stats")
      .then((r) => r.json())
      .then((json) => setStats(json))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) return null

  const summary = stats.summary[period] || { views: 0, clicks: 0, conversion: 0 }
  const ads = stats.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Estatísticas de Anúncios
        </h3>
      </div>

      <div
        className="inline-flex w-fit rounded-lg border border-border bg-card p-0.5 text-sm font-medium"
        role="group"
        aria-label="Período"
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
            className={cn(
              "inline-flex min-h-8 items-center rounded-md px-3 py-1 text-xs font-medium transition-colors sm:text-sm",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            Visualizações
          </div>
          <p className="mt-1 text-xl font-bold text-foreground">
            {summary.views.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            Cliques
          </div>
          <p className="mt-1 text-xl font-bold text-foreground">
            {summary.clicks.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            Conversão
          </div>
          <p
            className={cn(
              "mt-1 text-xl font-bold",
              summary.conversion >= 5
                ? "text-green-500"
                : summary.conversion >= 2
                  ? "text-yellow-500"
                  : "text-foreground",
            )}
          >
            {summary.conversion.toFixed(1)}%
          </p>
        </div>
      </div>

      {ads.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Por anúncio
          </p>
          <div className="flex flex-col gap-2">
            {ads.map((ad) => {
              const s = ad[period]
              return (
                <div
                  key={ad.ad_id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        ad.is_active ? "bg-green-500" : "bg-gray-400",
                      )}
                      title={ad.is_active ? "Ativo" : "Inativo"}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {ad.title}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Visualizações">
                      <Eye className="h-3 w-3" />
                      {s.views.toLocaleString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1" title="Cliques">
                      <MousePointerClick className="h-3 w-3" />
                      {s.clicks.toLocaleString("pt-BR")}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 font-medium",
                        s.conversion >= 5
                          ? "text-green-500"
                          : s.conversion >= 2
                            ? "text-yellow-500"
                            : "text-muted-foreground",
                      )}
                      title="Conversão"
                    >
                      <Percent className="h-3 w-3" />
                      {s.conversion.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
