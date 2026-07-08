"use client"

interface Option {
  value: string
  label: string
}

interface PillMultiSelectProps {
  legend: string
  options: Option[]
  values: string[]
  onChange: (values: string[]) => void
}

/** Grupo de pills com múltipla seleção (aria-pressed, alvo ≥44px). */
export function PillMultiSelect({ legend, options, values, onChange }: PillMultiSelectProps) {
  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((x) => x !== value) : [...values, value])
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground hover:border-primary/60"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
