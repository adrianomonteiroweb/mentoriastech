"use client"

import { useState } from "react"

interface StateData {
  state: string
  name: string
  ddds: string[]
  count: number
}

interface BrazilMapProps {
  data: StateData[]
}

const STATE_PATHS: Record<string, string> = {
  AC: "M95,340 L95,370 L120,370 L120,340 Z",
  AM: "M100,240 L100,310 L200,310 L200,280 L170,260 L170,240 Z",
  RR: "M140,190 L140,230 L170,230 L170,190 Z",
  AP: "M220,200 L220,240 L250,240 L250,200 Z",
  PA: "M170,240 L170,310 L280,310 L280,270 L250,240 L250,240 Z",
  MA: "M280,270 L280,310 L330,310 L330,280 L310,270 Z",
  TO: "M260,310 L260,380 L300,380 L300,310 Z",
  PI: "M320,280 L320,340 L350,340 L350,280 Z",
  CE: "M350,260 L350,300 L390,300 L390,260 Z",
  RN: "M390,270 L390,295 L415,295 L415,270 Z",
  PB: "M385,295 L385,315 L415,315 L415,295 Z",
  PE: "M350,310 L350,335 L410,335 L410,310 Z",
  AL: "M395,335 L395,355 L415,355 L415,335 Z",
  SE: "M385,355 L385,370 L405,370 L405,355 Z",
  BA: "M300,340 L300,420 L380,420 L380,370 L390,355 L390,340 Z",
  MG: "M280,390 L280,450 L360,450 L360,420 L340,390 Z",
  ES: "M360,420 L360,450 L385,450 L385,420 Z",
  RJ: "M340,450 L340,470 L380,470 L380,450 Z",
  SP: "M260,440 L260,480 L340,480 L340,450 L310,440 Z",
  PR: "M240,480 L240,510 L310,510 L310,480 Z",
  SC: "M260,510 L260,535 L310,535 L310,510 Z",
  RS: "M240,535 L240,580 L300,580 L300,535 Z",
  MS: "M210,410 L210,470 L260,470 L260,410 Z",
  MT: "M160,330 L160,410 L260,410 L260,370 L220,330 Z",
  GO: "M260,370 L260,440 L310,440 L310,400 L290,370 Z",
  DF: "M290,385 L290,400 L310,400 L310,385 Z",
  RO: "M120,340 L120,390 L170,390 L170,340 Z",
}

function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0) return "var(--geography-empty, #1e293b)"
  const ratio = count / maxCount
  if (ratio <= 0.25) return "var(--geography-low, #1e3a5f)"
  if (ratio <= 0.5) return "var(--geography-mid, #1d4ed8)"
  if (ratio <= 0.75) return "var(--geography-high, #3b82f6)"
  return "var(--geography-max, #60a5fa)"
}

export function BrazilMap({ data }: BrazilMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const dataMap = new Map(data.map((d) => [d.state, d]))
  const maxCount = Math.max(1, ...data.map((d) => d.count))

  const hoveredData = hoveredState ? dataMap.get(hoveredState) : null

  return (
    <div className="relative">
      <svg
        viewBox="70 180 370 420"
        className="w-full max-w-md mx-auto"
        style={{ aspectRatio: "370/420" }}
      >
        {Object.entries(STATE_PATHS).map(([state, path]) => {
          const stateData = dataMap.get(state)
          const count = stateData?.count || 0
          return (
            <path
              key={state}
              d={path}
              fill={getIntensityColor(count, maxCount)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              className="cursor-pointer transition-opacity duration-150"
              opacity={hoveredState && hoveredState !== state ? 0.5 : 1}
              onMouseEnter={(e) => {
                setHoveredState(state)
                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
                if (rect) {
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 10,
                  })
                }
              }}
              onMouseLeave={() => setHoveredState(null)}
            />
          )
        })}
        {Object.entries(STATE_PATHS).map(([state, path]) => {
          const match = path.match(/(\d+),(\d+)/)
          if (!match) return null
          const coords = path.match(/\d+/g)?.map(Number)
          if (!coords || coords.length < 4) return null
          const xs = coords.filter((_, i) => i % 2 === 0)
          const ys = coords.filter((_, i) => i % 2 === 1)
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2
          return (
            <text
              key={`label-${state}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-[8px] font-medium pointer-events-none select-none"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {state}
            </text>
          )
        })}
      </svg>

      {hoveredState && hoveredData && (
        <div
          className="absolute z-10 rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium text-foreground">
            {hoveredData.name} ({hoveredData.state})
          </p>
          <p className="text-muted-foreground">
            DDDs: {hoveredData.ddds.join(", ")}
          </p>
          <p className="text-primary font-semibold">
            {hoveredData.count} mentoria{hoveredData.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {hoveredState && !hoveredData && (
        <div
          className="absolute z-10 rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium text-foreground">{hoveredState}</p>
          <p className="text-muted-foreground">Sem mentorias neste mês</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-0.5">
          {[
            "var(--geography-empty, #1e293b)",
            "var(--geography-low, #1e3a5f)",
            "var(--geography-mid, #1d4ed8)",
            "var(--geography-high, #3b82f6)",
            "var(--geography-max, #60a5fa)",
          ].map((color, i) => (
            <div
              key={i}
              className="w-6 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  )
}
