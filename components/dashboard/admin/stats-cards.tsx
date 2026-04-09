"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Briefcase, FileText, CheckCircle2, Clock } from "lucide-react"
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
    { label: "Conteudos", value: stats?.publishedContent, icon: FileText, color: "text-purple-400" },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
