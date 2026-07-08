"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TagSelectProps {
  label: string
  placeholder: string
  suggestions: string[]
  values: string[]
  onChange: (values: string[]) => void
}

/**
 * Seleção híbrida: chips sugeridos (marcar/desmarcar) + campo livre para
 * adicionar qualquer palavra. Tudo normalizado em minúsculas — fiel ao
 * matching por substring no título que o bot faz.
 */
export function TagSelect({ label, placeholder, suggestions, values, onChange }: TagSelectProps) {
  const [draft, setDraft] = useState("")

  function toggle(tag: string) {
    const value = tag.trim().toLowerCase()
    if (!value) return
    onChange(values.includes(value) ? values.filter((x) => x !== value) : [...values, value])
  }

  function addDraft() {
    const value = draft.trim().toLowerCase()
    if (value && !values.includes(value)) onChange([...values, value])
    setDraft("")
  }

  // Selecionados que não estão nas sugestões viram chips removíveis abaixo.
  const custom = values.filter((v) => !suggestions.includes(v))

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const active = values.includes(suggestion)
          return (
            <button
              key={suggestion}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(suggestion)}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground hover:border-primary/60"
              }`}
            >
              {suggestion}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              addDraft()
            }
          }}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="button" variant="outline" size="sm" onClick={addDraft} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {custom.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {custom.map((value) => (
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
