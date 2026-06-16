"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2 } from "lucide-react"
import {
  calculateSelectionProcessScore,
  SELECTION_PROCESS_CHECKLIST_MAX_SCORE,
} from "@/lib/selection-process-checklist"
import type { SelectionProcessChecklistItem } from "@/lib/types/database"

interface ChecklistPopoverProps {
  candidateId: string
  checklist: SelectionProcessChecklistItem[]
  saving: boolean
  readOnly?: boolean
  onSave: (checklist: SelectionProcessChecklistItem[]) => void
}

export function ChecklistPopover({
  candidateId,
  checklist: initialChecklist,
  saving,
  readOnly,
  onSave,
}: ChecklistPopoverProps) {
  const [open, setOpen] = useState(false)
  const [checklist, setChecklist] = useState(initialChecklist)

  useEffect(() => {
    if (!open) setChecklist(initialChecklist)
  }, [initialChecklist, open])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !readOnly) {
      const changed = checklist.some((item, i) => item.checked !== initialChecklist[i]?.checked)
      if (changed) onSave(checklist)
    }
    setOpen(nextOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {calculateSelectionProcessScore(checklist)}/{SELECTION_PROCESS_CHECKLIST_MAX_SCORE} pontos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Checklist de avaliacao</p>
          {checklist.map((item) => {
            const checkboxId = `selection-checklist-${candidateId}-${item.id}`
            return (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={item.checked}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    setChecklist((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, checked: checked === true } : p)),
                    )
                  }
                  className="mt-0.5"
                />
                <Label htmlFor={checkboxId} className="text-xs font-normal leading-tight">
                  {item.label}
                </Label>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
