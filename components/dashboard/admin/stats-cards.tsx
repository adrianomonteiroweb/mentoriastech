"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Briefcase, FileText, CheckCircle2, Clock, AlertTriangle, MousePointerClick, Share2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminStats } from "@/lib/types/database"

export function StatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => setStats(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: "Total Agendamentos", value: stats?.totalBookings, icon: BookOpen, color: "text-blue-400" },
    { label: "Pendentes", value: stats?.pendingBookings, icon: Clock, color: "text-yellow-400" },
    { label: "Concluidos", value: stats?.completedBookings, icon: CheckCircle2, color: "text-green-400" },
    { label: "Mentorados", value: stats?.totalMentees, icon: Users, color: "text-primary" },
    { label: "Vagas Pendentes", value: stats?.pendingJobs, icon: Briefcase, color: "text-orange-400" },
    { label: "Vagas Reportadas", value: stats?.reportedJobs, icon: AlertTriangle, color: "text-red-400" },
    { label: "Candidaturas", value: stats?.totalApplications, icon: MousePointerClick, color: "text-teal-400" },
    { label: "Conteudos", value: stats?.publishedContent, icon: FileText, color: "text-purple-400" },
    { label: "Compartilhamentos", value: stats?.totalShares, icon: Share2, color: "text-primary" },
    { label: "Compart. Paginas", value: stats?.totalPageShares, icon: Share2, color: "text-cyan-400" },
    { label: "Compart. Conteudos", value: stats?.totalContentShares, icon: Share2, color: "text-violet-400" },
    { label: "Compart. Vagas", value: stats?.totalJobShares, icon: Share2, color: "text-emerald-400" },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{card.value ?? 0}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
