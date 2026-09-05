"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export type SeriesPoint = {
  date: string
  total: number
  international: number
}

const chartConfig = {
  total: { label: "Vagas", color: "hsl(var(--chart-1))" },
  international: { label: "Internacionais", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return reduced
}

function formatTick(value: string) {
  const [, month, day] = value.split("-")
  return `${day}/${month}`
}

/**
 * Evolução do volume de vagas no tempo.
 *
 * Duas decisões que o gráfico não pode abrir mão:
 *  - eixo Y começa em ZERO (`domain={[0, "auto"]}`). Eixo truncado é a forma
 *    mais barata de fazer uma variação pequena parecer um colapso.
 *  - o último bucket é sombreado, porque ele está INCOMPLETO (o dia/semana/mês
 *    ainda está correndo). Sem essa marca, todo gráfico "termina caindo" e o
 *    leitor lê queda onde há só período parcial.
 */
export function TimeseriesChart({ points }: { points: SeriesPoint[] }) {
  const reducedMotion = useReducedMotion()

  if (points.length < 2) return null

  const lastDate = points[points.length - 1].date
  const previousDate = points[points.length - 2].date

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart data={points} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatTick}
        />
        <YAxis
          domain={[0, "auto"]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ReferenceArea
          x1={previousDate}
          x2={lastDate}
          fill="hsl(var(--muted-foreground))"
          fillOpacity={0.12}
          ifOverflow="visible"
        />
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          fill="var(--color-total)"
          fillOpacity={0.18}
          strokeWidth={2}
          isAnimationActive={!reducedMotion}
        />
        <Area
          dataKey="international"
          type="monotone"
          stroke="var(--color-international)"
          fill="var(--color-international)"
          fillOpacity={0.12}
          strokeWidth={2}
          isAnimationActive={!reducedMotion}
        />
      </AreaChart>
    </ChartContainer>
  )
}
