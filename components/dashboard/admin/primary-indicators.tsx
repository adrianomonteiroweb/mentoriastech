"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Eye,
  Gift,
  Linkedin,
  MapPin,
  MousePointerClick,
  Percent,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminStats, MenteesByOrigin, PeriodValues } from "@/lib/types/database"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

type Period = "today" | "week" | "month"

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
]

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})
const numberFormatter = new Intl.NumberFormat("pt-BR")

function formatCents(cents: number | undefined): string {
  return currencyFormatter.format((cents ?? 0) / 100)
}

function formatPercent(value: number | undefined): string {
  const n = value ?? 0
  if (!Number.isFinite(n)) return "0%"
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

function pickPeriod(pv: PeriodValues | undefined, period: Period): number {
  if (!pv) return 0
  return pv[period]
}

function monthChange(current: number, prev: number): { label: string; positive: boolean } | null {
  const c = Number(current) || 0
  const p = Number(prev) || 0
  if (c === 0 && p === 0) return null
  if (p === 0) return { label: "novo", positive: true }
  const change = ((c - p) / p) * 100
  const rounded = Math.round(change * 10) / 10
  if (!Number.isFinite(rounded)) return null
  return { label: `${Math.abs(rounded)}%`, positive: rounded >= 0 }
}

function rate(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(numerator)) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

interface IndicatorCard {
  label: string
  value: string | number
  sublabel?: string
  icon: typeof Users
  color: string
  compactValue?: boolean
  change?: { label: string; positive: boolean } | null
}

interface IndicatorGroup {
  id: string
  title: string
  cards: IndicatorCard[]
}

function buildGroups(stats: AdminStats | null, period: Period): IndicatorGroup[] {
  const ts = stats?.timeSeries
  const isMonth = period === "month"

  const completedVal = pickPeriod(ts?.mentorias.completed, period)
  const pendingVal = pickPeriod(ts?.mentorias.pending, period)
  const menteesVal = pickPeriod(ts?.mentorias.mentees, period)
  const totalVal = pickPeriod(ts?.mentorias.total, period)
  const completionRate = rate(completedVal, totalVal)

  const revenueVal = pickPeriod(ts?.receita.revenueCents, period)
  const visitsVal = pickPeriod(ts?.publico.visits, period)
  const clicksVal = pickPeriod(ts?.publico.clicks, period)
  const newMenteesVal = pickPeriod(ts?.publico.newMentees, period)

  return [
    {
      id: "mentorias",
      title: "Mentorias",
      cards: [
        {
          label: "Concluídas",
          value: completedVal,
          icon: CheckCircle2,
          color: "text-green-400",
          change: isMonth ? monthChange(completedVal, ts?.mentorias.completed.prevMonth ?? 0) : null,
        },
        {
          label: "Pendentes",
          value: pendingVal,
          icon: Clock,
          color: "text-yellow-400",
          change: isMonth ? monthChange(pendingVal, ts?.mentorias.pending.prevMonth ?? 0) : null,
        },
        {
          label: "Mentorados",
          value: menteesVal,
          icon: Users,
          color: "text-primary",
          change: isMonth ? monthChange(menteesVal, ts?.mentorias.mentees.prevMonth ?? 0) : null,
        },
        {
          label: "Taxa de conclusão",
          value: formatPercent(completionRate),
          sublabel: "concluídas / total",
          icon: TrendingUp,
          color: "text-emerald-400",
        },
      ],
    },
    {
      id: "receita",
      title: "Receita & Mentorias Pagas",
      cards: [
        {
          label: "Receita no período",
          value: formatCents(revenueVal),
          icon: Wallet,
          color: "text-green-400",
          change: isMonth ? monthChange(revenueVal, ts?.receita.revenueCents.prevMonth ?? 0) : null,
        },
        {
          label: "Receita total",
          value: formatCents(stats?.totalPaidRevenueCents),
          sublabel: `Ticket médio ${formatCents(stats?.avgTicketCents)}`,
          icon: BadgeDollarSign,
          color: "text-emerald-400",
        },
        {
          label: "Conversão pagas",
          value: formatPercent(stats?.paidConversionRate),
          sublabel: "cliques / visualizações",
          icon: CreditCard,
          color: "text-blue-400",
        },
        {
          label: "Paga mais pedida",
          value: stats?.mostRequestedPaid?.name ?? "—",
          sublabel: stats?.mostRequestedPaid ? `${stats.mostRequestedPaid.count} pedidos` : "sem pedidos",
          icon: Crown,
          color: "text-amber-400",
          compactValue: true,
        },
      ],
    },
    {
      id: "publico",
      title: "Página Pública & Aquisição",
      cards: [
        {
          label: "Visitas",
          value: visitsVal,
          sublabel: `${numberFormatter.format(stats?.publicVisits ?? 0)} no total`,
          icon: Eye,
          color: "text-cyan-400",
          change: isMonth ? monthChange(visitsVal, ts?.publico.visits.prevMonth ?? 0) : null,
        },
        {
          label: "Última hora",
          value: stats?.visitsLastHour ?? 0,
          sublabel: "visitas nos últimos 60 min",
          icon: Zap,
          color: "text-yellow-400",
        },
        {
          label: "Cliques",
          value: clicksVal,
          icon: MousePointerClick,
          color: "text-violet-400",
          change: isMonth ? monthChange(clicksVal, ts?.publico.clicks.prevMonth ?? 0) : null,
        },
        {
          label: "Conversão página",
          value: formatPercent(rate(clicksVal, visitsVal)),
          sublabel: "cliques / visitas",
          icon: Percent,
          color: "text-primary",
        },
        {
          label: "Conversão anúncios",
          value: formatPercent(stats?.adsConversionRate),
          sublabel: "cliques / visualizações",
          icon: Percent,
          color: "text-orange-400",
        },
        {
          label: "Novos mentorados",
          value: newMenteesVal,
          icon: UserPlus,
          color: "text-teal-400",
          change: isMonth ? monthChange(newMenteesVal, ts?.publico.newMentees.prevMonth ?? 0) : null,
        },
        {
          label: "Gratuita mais pedida",
          value: stats?.mostRequestedFree?.name ?? "—",
          sublabel: stats?.mostRequestedFree ? `${stats.mostRequestedFree.count} pedidos` : "sem pedidos",
          icon: Gift,
          color: "text-pink-400",
          compactValue: true,
        },
      ],
    },
  ]
}

function ChangeIndicator({ change }: { change: { label: string; positive: boolean } | null | undefined }) {
  if (!change) return null
  const isNew = change.label === "novo"
  return (
    <span
      className={`ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium ${
        change.positive ? "text-green-400" : "text-red-400"
      }`}
    >
      {!isNew && (change.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      {change.label}
    </span>
  )
}

interface ToolRow {
  name: string
  icon: typeof Sparkles
  clicks: number
  uses: number
  conversionRate: number
  clicksChange?: { label: string; positive: boolean } | null
  usesChange?: { label: string; positive: boolean } | null
}

function ToolStatsBlock({ stats, period, loading }: { stats: AdminStats | null; period: Period; loading: boolean }) {
  const ts = stats?.timeSeries?.ferramentas
  const isMonth = period === "month"

  const tools: ToolRow[] = [
    {
      name: "Currículo IA",
      icon: Sparkles,
      clicks: pickPeriod(ts?.resume.clicks, period),
      uses: pickPeriod(ts?.resume.uses, period),
      conversionRate: rate(pickPeriod(ts?.resume.uses, period), pickPeriod(ts?.resume.clicks, period)),
      clicksChange: isMonth ? monthChange(pickPeriod(ts?.resume.clicks, period), ts?.resume.clicks.prevMonth ?? 0) : null,
      usesChange: isMonth ? monthChange(pickPeriod(ts?.resume.uses, period), ts?.resume.uses.prevMonth ?? 0) : null,
    },
    {
      name: "LinkedIn IA",
      icon: Linkedin,
      clicks: pickPeriod(ts?.linkedin.clicks, period),
      uses: pickPeriod(ts?.linkedin.uses, period),
      conversionRate: rate(pickPeriod(ts?.linkedin.uses, period), pickPeriod(ts?.linkedin.clicks, period)),
      clicksChange: isMonth ? monthChange(pickPeriod(ts?.linkedin.clicks, period), ts?.linkedin.clicks.prevMonth ?? 0) : null,
      usesChange: isMonth ? monthChange(pickPeriod(ts?.linkedin.uses, period), ts?.linkedin.uses.prevMonth ?? 0) : null,
    },
  ]

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Ferramentas por uso
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.name} className="flex items-center gap-3">
                <tool.icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tool.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>
                      {tool.clicks} cliques
                      <ChangeIndicator change={tool.clicksChange} />
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>
                      {tool.uses} usos
                      <ChangeIndicator change={tool.usesChange} />
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-medium text-primary">{formatPercent(tool.conversionRate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const ORIGIN_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  palestra: "Palestra",
  indicacao: "Indicação",
  evento: "Evento",
}

function MenteesByOriginBlock({ data, loading }: { data: MenteesByOrigin[]; loading: boolean }) {
  const total = data.reduce((acc, d) => acc + d.count, 0)

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Mentorados por Origem
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado de origem registrado</p>
        ) : (
          <div className="space-y-2.5">
            {data.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
              return (
                <div key={item.origin} className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{ORIGIN_LABELS[item.origin] ?? item.origin}</p>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {item.count} <span className="text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <p className="pt-1 text-xs text-muted-foreground text-right">
              {total} mentorado{total !== 1 ? "s" : ""} com origem informada
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PrimaryIndicatorsProps {
  isBlockVisible?: (id: string) => boolean
}

export function PrimaryIndicators({ isBlockVisible }: PrimaryIndicatorsProps = {}) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("today")
  const { mentorId, buildUrl } = useMentorFilter()

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl("/api/admin/stats"))
      .then((r) => r.json())
      .then((json) => setStats(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mentorId])

  const groups = buildGroups(stats, period).filter(
    (group) => !isBlockVisible || isBlockVisible(group.id),
  )
  const showFerramentas = !isBlockVisible || isBlockVisible("ferramentas")

  if (groups.length === 0 && !showFerramentas) return null

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Principais Indicadores</h2>
        <ToggleGroup
          type="single"
          size="sm"
          value={period}
          onValueChange={(v) => { if (v) setPeriod(v as Period) }}
          className="gap-1 rounded-md bg-muted/50 p-0.5"
        >
          {PERIODS.map((p) => (
            <ToggleGroupItem
              key={p.value}
              value={p.value}
              aria-label={`Período: ${p.label}`}
              className="h-7 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {group.cards.map((card) => (
              <Card key={card.label} className="border-primary/20 bg-primary/[0.03]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <card.icon className={`h-4 w-4 shrink-0 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <>
                      <p
                        className={`truncate font-bold ${card.compactValue ? "text-base" : "text-2xl"}`}
                        title={String(card.value)}
                      >
                        {card.value}
                        <ChangeIndicator change={card.change} />
                      </p>
                      {card.sublabel && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{card.sublabel}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {showFerramentas && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ferramentas Minhas Mentorias
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToolStatsBlock stats={stats} period={period} loading={loading} />
          </div>
        </div>
      )}

      {(!isBlockVisible || isBlockVisible("origens")) && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Aquisição por Origem
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MenteesByOriginBlock data={stats?.menteesByOrigin ?? []} loading={loading} />
          </div>
        </div>
      )}
    </section>
  )
}
