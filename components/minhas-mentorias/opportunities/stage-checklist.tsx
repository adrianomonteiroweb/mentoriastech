"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useOpportunities } from "./opportunities-context"
import type { ChecklistItem } from "./types"

interface Props {
  opportunityId: string
  items: ChecklistItem[]
}

export function StageChecklist({ opportunityId, items }: Props) {
  const { updateChecklist } = useOpportunities()

  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Nenhum checklist para esta etapa.
      </p>
    )
  }

  const checked = items.filter((i) => i.checked).length
  const total = items.length
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {checked} de {total} {total === 1 ? "passo concluido" : "passos concluidos"}
          </span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Nudge */}
      {checked > 0 && checked < total && (
        <p className="text-xs text-primary">
          Falta pouco! Complete {total - checked === 1 ? "o ultimo passo" : `mais ${total - checked} passos`}.
        </p>
      )}
      {checked === total && total > 0 && (
        <p className="text-xs text-green-400">
          Tudo pronto! Voce pode avancar para a proxima etapa.
        </p>
      )}

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5"
          >
            <Checkbox
              id={`check-${item.id}`}
              checked={item.checked}
              onCheckedChange={(val) => {
                updateChecklist(opportunityId, item.id, val === true)
              }}
              className="mt-0.5"
            />
            <Label
              htmlFor={`check-${item.id}`}
              className={`text-sm leading-relaxed cursor-pointer ${
                item.checked ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
