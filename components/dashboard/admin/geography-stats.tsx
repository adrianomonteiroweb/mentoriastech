"use client"

import { useEffect, useState } from "react"
import { Globe, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BrazilMap } from "./brazil-map"
import { InternationalChart } from "./international-chart"

interface StateData {
  state: string
  name: string
  ddds: string[]
  count: number
}

interface CountryData {
  countryCode: string
  country: string
  count: number
}

interface GeographyData {
  brazil: StateData[]
  international: CountryData[]
}

function getMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

export function GeographyStats() {
  const monthOptions = getMonthOptions()
  const [month, setMonth] = useState(monthOptions[0].value)
  const [data, setData] = useState<GeographyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/stats/geography?month=${month}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [month])

  const totalBrazil = data?.brazil.reduce((s, d) => s + d.count, 0) || 0
  const totalInternational = data?.international.reduce((s, d) => s + d.count, 0) || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Mentorias por Região</h2>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center justify-center h-80">
              <div className="animate-pulse text-sm text-muted-foreground">Carregando...</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center h-80">
              <div className="animate-pulse text-sm text-muted-foreground">Carregando...</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Brasil por Estado
                {totalBrazil > 0 && (
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {totalBrazil} mentoria{totalBrazil !== 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.brazil.length > 0 ? (
                <BrazilMap data={data.brazil} />
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  Sem mentorias nacionais neste mês
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-primary" />
                Internacional
                {totalInternational > 0 && (
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {totalInternational} mentoria{totalInternational !== 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <InternationalChart data={data.international} />
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  Erro ao carregar dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
