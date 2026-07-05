"use client"

import type { ReactNode } from "react"
import { HelpCircle } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Props {
  /** Conceito explicado (ex.: "Doing", "WIP limit"). */
  title: string
  children: ReactNode
  className?: string
}

/**
 * Ajuda contextual "?" (just-in-time learning) para ensinar conceitos de SCRUM/
 * Kanban no exato ponto de uso. Popover (funciona no toque em mobile, ao
 * contrário de tooltip só-hover), acessível via teclado.
 */
export function ConceptTip({ title, children, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`O que é ${title}?`}
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground ${
            className || ""
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="mb-1 text-sm font-semibold text-foreground">{title}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  )
}
