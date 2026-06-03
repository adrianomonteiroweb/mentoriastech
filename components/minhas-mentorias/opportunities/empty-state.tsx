"use client"

import { Briefcase, CalendarCheck, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOpportunities } from "./opportunities-context"
import type { ViewTab } from "./types"

const CONFIG: Record<ViewTab, { icon: typeof Briefcase; title: string; description: string }> = {
  hoje: {
    icon: CalendarCheck,
    title: "Nenhuma acao pendente",
    description: "Voce esta em dia! Quando tiver acoes importantes, elas aparecerao aqui.",
  },
  kanban: {
    icon: Briefcase,
    title: "Nenhuma oportunidade ainda",
    description: "Cadastre sua primeira oportunidade para comecar a organizar suas candidaturas.",
  },
  lista: {
    icon: List,
    title: "Nenhuma oportunidade encontrada",
    description: "Tente ajustar os filtros ou cadastre uma nova oportunidade.",
  },
}

interface Props {
  view: ViewTab
  hasFilters?: boolean
}

export function EmptyState({ view, hasFilters }: Props) {
  const { dispatch } = useOpportunities()
  const cfg = CONFIG[view]
  const Icon = cfg.icon

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-secondary/30 p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? "Nenhuma oportunidade com esses filtros" : cfg.title}
        </p>
        <p className="text-xs text-muted-foreground">{cfg.description}</p>
      </div>
      {view !== "hoje" && (
        <Button
          size="sm"
          onClick={() => dispatch({ type: "OPEN_CREATE" })}
        >
          Nova oportunidade
        </Button>
      )}
    </div>
  )
}
