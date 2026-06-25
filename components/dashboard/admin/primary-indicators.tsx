"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Eye,
  Gift,
  MousePointerClick,
  Percent,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminStats } from "@/lib/types/database"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatCents(cents: number | undefined): string {
  return currencyFormatter.format((cents ?? 0) / 100)
}

function formatPercent(value: number | undefined): string {
  return `${(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

interface IndicatorCard {
  label: string
  value: string | number
  sublabel?: string
  icon: typeof Users
  color: string
  /** Usa fonte menor para valores textuais longos (ex: nomes de mentoria). */
  compactValue?: boolean
}

interface IndicatorGroup {
  id: string
  title: string
  cards: IndicatorCard[]
}

function buildGroups(stats: AdminStats | null): IndicatorGroup[] {
  return [
    {
      id: "mentorias",
      title: "Mentorias",
      cards: [
        { label: "Concluídas", value: stats?.completedBookings ?? 0, icon: CheckCircle2, color: "text-green-400" },
        { label: "Pendentes", value: stats?.pendingBookings ?? 0, icon: Clock, color: "text-yellow-400" },
        { label: "Mentorados", value: stats?.totalMentees ?? 0, icon: Users, color: "text-primary" },
        {
          label: "Taxa de conclusão",
          value: formatPercent(stats?.completionRate),
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
          label: "Receita no mês",
          value: formatCents(stats?.monthlyPaidRevenueCents),
          icon: Wallet,
          color: "text-green-400",
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
        { label: "Visitas", value: stats?.publicVisits ?? 0, icon: Eye, color: "text-cyan-400" },
        { label: "Cliques", value: stats?.publicClicks ?? 0, icon: MousePointerClick, color: "text-violet-400" },
        {
          label: "Conversão página",
          value: formatPercent(stats?.publicConversionRate),
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
          label: "Novos mentorados (mês)",
          value: stats?.newMenteesThisMonth ?? 0,
          icon: UserPlus,
          color: "text-teal-400",
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
    {
      id: "ferramentas",
      title: "Ferramentas Minhas Mentorias",
      cards: [
        {
          label: "Usos de ferramentas",
          value: stats?.minhasMentoriasToolUses ?? 0,
          sublabel: "IA currículo, LinkedIn, oportunidades e vagas",
          icon: Sparkles,
          color: "text-primary",
        },
      ],
    },
  ]
}

interface PrimaryIndicatorsProps {
  /** Predicado que decide se um bloco (por id) deve ser exibido. */
  isBlockVisible?: (id: string) => boolean
}

export function PrimaryIndicators({ isBlockVisible }: PrimaryIndicatorsProps = {}) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { mentorId, buildUrl } = useMentorFilter()

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl("/api/admin/stats"))
      .then((r) => r.json())
      .then((json) => setStats(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mentorId])

  const groups = buildGroups(stats).filter(
    (group) => !isBlockVisible || isBlockVisible(group.id),
  )

  if (groups.length === 0) return null

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Principais Indicadores</h2>
      </div>

      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
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
    </section>
  )
}
