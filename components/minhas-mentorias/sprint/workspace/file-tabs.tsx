"use client"

import { X } from "lucide-react"
import { fileIcon } from "./file-tree"

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
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-secondary/40 scrollbar-none"
      role="tablist"
      aria-label="Arquivos abertos"
    >
      {tabs.map((path) => {
        const name = path.split("/").pop() || path
        const active = path === activePath
        return (
          <div
            key={path}
            className={`group flex shrink-0 items-center gap-1.5 border-r border-border pl-3 pr-1.5 ${
              active
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {fileIcon(name)}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onActivate(path)}
              className="whitespace-nowrap text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              title={path}
            >
              {name}
            </button>
            <button
              type="button"
              onClick={() => onClose(path)}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Fechar ${name}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
