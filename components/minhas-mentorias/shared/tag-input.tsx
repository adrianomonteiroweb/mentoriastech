"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TagInputProps {
  label: string
  placeholder: string
  values: string[]
  onChange: (values: string[]) => void
}

/** Entrada de tags com chips removíveis (Enter/vírgula para adicionar). */
export function TagInput({ label, placeholder, values, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("")

  function add() {
    const value = draft.trim()
    if (value && !values.includes(value)) onChange([...values, value])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              {value}
              <button
                type="button"
                aria-label={`Remover ${value}`}
                onClick={() => onChange(values.filter((x) => x !== value))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
