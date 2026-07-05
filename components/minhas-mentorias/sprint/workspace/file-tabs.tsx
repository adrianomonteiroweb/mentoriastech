"use client"

import { X } from "lucide-react"

interface Props {
  tabs: string[]
  activePath: string | null
  onActivate: (path: string) => void
  onClose: (path: string) => void
}

export function FileTabs({ tabs, activePath, onActivate, onClose }: Props) {
  if (tabs.length === 0) return null

  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-border bg-secondary/30 px-1 pt-1"
      role="tablist"
      aria-label="Arquivos abertos"
    >
      {tabs.map((path) => {
        const name = path.split("/").pop() || path
        const active = path === activePath
        return (
          <div
            key={path}
            className={`flex shrink-0 items-center gap-1 rounded-t-md border border-b-0 px-2 ${
              active
                ? "border-border bg-card text-foreground"
                : "border-transparent bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onActivate(path)}
              className="min-h-[36px] text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              title={path}
            >
              {name}
            </button>
            <button
              type="button"
              onClick={() => onClose(path)}
              className="rounded p-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Fechar ${name}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
