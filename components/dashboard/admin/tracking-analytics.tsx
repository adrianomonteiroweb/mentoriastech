"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Briefcase, Globe, Home, Link2, Search, Users, Wrench } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SourceRow {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  path: string
  totalViews: number
  uniqueVisitors: number
}

interface TrafficRow {
  path: string
  totalViews: number
  uniqueVisitors: number
}

interface KeyPageRow {
  section: string
  totalViews: number
  uniqueVisitors: number
}

interface AnalyticsData {
  bySource: SourceRow[]
  organicGoogle: TrafficRow[]
  directTraffic: TrafficRow[]
  keyPages: KeyPageRow[]
  period: { value: string; since: string }
}

interface TrackingAnalyticsProps {
  refreshKey: number
  period: string
  onPeriodChange: (period: string) => void
}

const PERIOD_OPTIONS = [
  { value: "1h", label: "Última hora" },
  { value: "6h", label: "Últimas 6 horas" },
  { value: "12h", label: "Últimas 12 horas" },
  { value: "24h", label: "Últimas 24 horas" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimos 14 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
]

const SECTIONS = [
  { key: "/", label: "Página inicial", Icon: Home },
  { key: "/jobs", label: "Vagas", Icon: Briefcase },
  { key: "/content", label: "Conteúdos", Icon: BookOpen },
  { key: "/ferramentas", label: "Ferramentas", Icon: Wrench },
] as const

export function TrackingAnalytics({ refreshKey, period, onPeriodChange }: TrackingAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/tracking-links/analytics?period=${period}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || null))
      .finally(() => setLoading(false))
  }, [refreshKey, period])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalUtm = data.bySource.reduce((acc, row) => acc + row.totalViews, 0)
  const totalOrganic = data.organicGoogle.reduce((acc, row) => acc + row.totalViews, 0)
  const totalDirect = data.directTraffic.reduce((acc, row) => acc + row.totalViews, 0)

  const keyPagesMap = new Map(data.keyPages.map((row) => [row.section, row]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Visão geral de tráfego</h3>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {SECTIONS.map(({ key, label, Icon }) => {
          const row = keyPagesMap.get(key)
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{row?.totalViews ?? 0}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {row?.uniqueVisitors ?? 0} únicos
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas (UTM)</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUtm}</div>
            <p className="text-xs text-muted-foreground">visitas rastreadas por links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Orgânico</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrganic}</div>
            <p className="text-xs text-muted-foreground">visitas de buscas no Google</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tráfego Direto</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDirect}</div>
            <p className="text-xs text-muted-foreground">visitas sem referrer</p>
          </CardContent>
        </Card>
      </div>

      {data.bySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Detalhamento por fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.bySource.slice(0, 15).map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="shrink-0">{row.utmSource}</Badge>
                    <Badge variant="outline" className="shrink-0">{row.utmMedium}</Badge>
                    {row.utmCampaign && (
                      <span className="text-muted-foreground truncate">{row.utmCampaign}</span>
                    )}
                    <span className="font-mono text-xs text-muted-foreground">{row.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="font-semibold">{row.totalViews}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {row.uniqueVisitors}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.organicGoogle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Google Orgânico — por página</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.organicGoogle.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{row.path}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{row.totalViews}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {row.uniqueVisitors}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.directTraffic.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tráfego Direto — por página</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.directTraffic.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{row.path}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{row.totalViews}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {row.uniqueVisitors}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
