"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Globe, Link2, Search, Users } from "lucide-react"
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

interface AnalyticsData {
  bySource: SourceRow[]
  organicGoogle: TrafficRow[]
  directTraffic: TrafficRow[]
  period: { days: number; since: string }
}

interface TrackingAnalyticsProps {
  refreshKey: number
}

export function TrackingAnalytics({ refreshKey }: TrackingAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/tracking-links/analytics?days=${days}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || null))
      .finally(() => setLoading(false))
  }, [refreshKey, days])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const totalUtm = data.bySource.reduce((acc, row) => acc + row.totalViews, 0)
  const totalOrganic = data.organicGoogle.reduce((acc, row) => acc + row.totalViews, 0)
  const totalDirect = data.directTraffic.reduce((acc, row) => acc + row.totalViews, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Visao geral de trafego</h3>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
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
            <CardTitle className="text-sm font-medium">Google Organico</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrganic}</div>
            <p className="text-xs text-muted-foreground">visitas de buscas no Google</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trafego Direto</CardTitle>
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
            <CardTitle className="text-sm font-medium">Google Organico — por pagina</CardTitle>
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
    </div>
  )
}
