"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface CountryData {
  countryCode: string
  country: string
  count: number
}

interface InternationalChartProps {
  data: CountryData[]
}

const chartConfig = {
  count: {
    label: "Mentorias",
    color: "hsl(var(--chart-1, 221 83% 53%))",
  },
} satisfies ChartConfig

export function InternationalChart({ data }: InternationalChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Sem mentorias internacionais neste mês
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="country"
          type="category"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
