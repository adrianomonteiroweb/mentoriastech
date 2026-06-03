"use client"

import { useMemo } from "react"
import { ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  JOB_LEVEL_LABELS,
  STAGE_MAP,
  STAGES,
  WORK_MODEL_LABELS,
} from "./constants"
import { EmptyState } from "./empty-state"
import { FollowUpIndicator } from "./follow-up-indicator"
import { MoveStageDropdown } from "./move-stage-dropdown"
import { useOpportunities } from "./opportunities-context"
import { PriorityBadge } from "./priority-badge"
import type { ApiOpportunity, OpportunityFilters } from "./types"

function applyFilters(opps: ApiOpportunity[], f: OpportunityFilters) {
  return opps.filter((o) => {
    if (f.stage !== "all" && o.status !== f.stage) return false
    if (f.priority !== "all" && o.priority !== f.priority) return false
    if (f.workModel !== "all" && o.work_model !== f.workModel) return false
    if (f.level !== "all" && o.job_level !== f.level) return false
    if (f.company && !o.company_name.toLowerCase().includes(f.company.toLowerCase())) return false
    return true
  })
}

function hasActiveFilters(f: OpportunityFilters) {
  return (
    f.stage !== "all" ||
    f.priority !== "all" ||
    f.workModel !== "all" ||
    f.level !== "all" ||
    f.company !== ""
  )
}

function formatDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function daysSince(d: string | null): string {
  if (!d) return "-"
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Hoje"
  if (days === 1) return "1d"
  return `${days}d`
}

// --- Filters Bar ---
function FiltersBar() {
  const { state, dispatch } = useOpportunities()
  const f = state.filters
  const active = hasActiveFilters(f)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={f.stage}
        onValueChange={(v) => dispatch({ type: "SET_FILTER", filter: { stage: v as OpportunityFilters["stage"] } })}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas etapas</SelectItem>
          {STAGES.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={f.priority}
        onValueChange={(v) => dispatch({ type: "SET_FILTER", filter: { priority: v as OpportunityFilters["priority"] } })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Prioridade</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Media</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={f.workModel}
        onValueChange={(v) => dispatch({ type: "SET_FILTER", filter: { workModel: v as OpportunityFilters["workModel"] } })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Modelo</SelectItem>
          {Object.entries(WORK_MODEL_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={f.level}
        onValueChange={(v) => dispatch({ type: "SET_FILTER", filter: { level: v as OpportunityFilters["level"] } })}
      >
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue placeholder="Nivel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Nivel</SelectItem>
          {Object.entries(JOB_LEVEL_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => dispatch({ type: "RESET_FILTERS" })}
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}

// --- Row ---
function OpportunityRow({ opportunity }: { opportunity: ApiOpportunity }) {
  const { dispatch } = useOpportunities()
  const o = opportunity
  const stage = STAGE_MAP[o.status]

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => dispatch({ type: "SELECT", id: o.id })}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {o.company_name}
            </span>
            {stage && (
              <Badge variant="outline" className={`text-[10px] ${stage.color} ${stage.borderColor} flex-shrink-0`}>
                {stage.shortLabel}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {o.title || "Vaga"}
            {o.work_model && ` · ${WORK_MODEL_LABELS[o.work_model] || o.work_model}`}
            {o.job_level && ` · ${JOB_LEVEL_LABELS[o.job_level] || o.job_level}`}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <PriorityBadge priority={o.priority} />
          <FollowUpIndicator dueDate={o.next_follow_up_at} />
          <span className="text-[10px] text-muted-foreground w-8 text-right">
            {daysSince(o.updated_at)}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            {o.status !== "finalized" && (
              <MoveStageDropdown opportunityId={o.id} currentStage={o.status} compact />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main View ---
export function ListView() {
  const { state } = useOpportunities()

  const filtered = useMemo(
    () => applyFilters(state.opportunities, state.filters),
    [state.opportunities, state.filters],
  )

  const active = hasActiveFilters(state.filters)

  if (state.opportunities.length === 0) {
    return <EmptyState view="lista" />
  }

  return (
    <div className="flex flex-col gap-3">
      <FiltersBar />
      {filtered.length === 0 ? (
        <EmptyState view="lista" hasFilters={active} />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "oportunidade" : "oportunidades"}
          </p>
          {filtered.map((o) => (
            <OpportunityRow key={o.id} opportunity={o} />
          ))}
        </div>
      )}
    </div>
  )
}
