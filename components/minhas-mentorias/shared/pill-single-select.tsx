"use client"

interface Option {
  value: string
  label: string
}

interface PillSingleSelectProps {
  legend: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** Grupo de pills com seleção única (sempre uma ativa, alvo ≥44px). */
export function PillSingleSelect({ legend, options, value, onChange }: PillSingleSelectProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
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
