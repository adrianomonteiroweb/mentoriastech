"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { AdminStats } from "@/lib/types/database"

type Period = "today" | "week" | "month"

const PERIODS: { value: Period; label: string; description: string }[] = [
  { value: "today", label: "Hoje", description: "desde a meia-noite" },
  { value: "week", label: "Semana", description: "desde segunda-feira" },
  { value: "month", label: "Mês", description: "desde o dia 1º" },
]

const numberFormatter = new Intl.NumberFormat("pt-BR")

interface VisitsCardProps {
  stats: AdminStats | null
  loading: boolean
}

/**
 * Card de visitas com seletor de período (Hoje · Semana · Mês).
 * Mantém um único número-herói em foco e o total acumulado como âncora de
 * contexto, em vez de empilhar três cards e aumentar a carga visual.
 */
export function VisitsCard({ stats, loading }: VisitsCardProps) {
  const [period, setPeriod] = useState<Period>("today")

  const valueByPeriod: Record<Period, number> = {
    today: stats?.visitsToday ?? 0,
    week: stats?.visitsThisWeek ?? 0,
    month: stats?.visitsThisMonth ?? 0,
  }

  const active = PERIODS.find((p) => p.value === period) ?? PERIODS[0]

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Visitas
        </CardTitle>
        <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
      </CardHeader>
      <CardContent>
        <ToggleGroup
          type="single"
          size="sm"
          value={period}
          onValueChange={(value) => {
            // Radix permite "desmarcar" — ignoramos para manter sempre um período ativo.
            if (value) setPeriod(value as Period)
          }}
          className="mb-3 w-full justify-start gap-1 rounded-md bg-muted/50 p-0.5"
        >
          {PERIODS.map((p) => (
            <ToggleGroupItem
              key={p.value}
              value={p.value}
              aria-label={`Visitas ${p.label}`}
              className="h-7 flex-1 px-2 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <p className="text-2xl font-bold">
              {numberFormatter.format(valueByPeriod[period])}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {active.description} · {numberFormatter.format(stats?.publicVisits ?? 0)} no total
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
