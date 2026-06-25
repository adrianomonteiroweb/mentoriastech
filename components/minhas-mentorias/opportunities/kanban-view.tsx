"use client"

import { useMemo } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useIsMobile } from "@/components/ui/use-mobile"
import { STAGES } from "./constants"
import { OpportunityCard } from "./opportunity-card"
import { SuggestedJobsColumn } from "./suggested-jobs-column"
import { useOpportunities } from "./opportunities-context"
import type { ApiOpportunity, OpportunityStatus } from "./types"

function groupByStage(opps: ApiOpportunity[]) {
  const groups: Record<OpportunityStatus, ApiOpportunity[]> = {
    evaluating: [],
    preparing_application: [],
    resume_sent: [],
    in_conversation: [],
    interviews: [],
    offer: [],
    finalized: [],
  }
  for (const o of opps) {
    if (groups[o.status]) {
      groups[o.status].push(o)
    }
  }
  return groups
}

// --- Mobile: Accordion ---
function MobileKanban({ groups }: { groups: Record<OpportunityStatus, ApiOpportunity[]> }) {
  const nonEmpty = STAGES.filter((s) => groups[s.key].length > 0)
  const defaultOpen = nonEmpty.length > 0 ? nonEmpty[0].key : undefined

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen}>
      {/* Coluna Vagas sugeridas */}
      <AccordionItem value="vagas">
        <AccordionTrigger className="py-3 text-sm hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Vagas para voce</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <SuggestedJobsColumn variant="accordion" />
        </AccordionContent>
      </AccordionItem>

      {STAGES.map((stage) => {
        const items = groups[stage.key]
        return (
          <AccordionItem key={stage.key} value={stage.key}>
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stage.color.replace("text-", "bg-")}`} />
                <span>{stage.label}</span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {items.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  Nenhuma oportunidade nesta etapa.
                </p>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {items.map((o) => (
                    <OpportunityCard key={o.id} opportunity={o} compact />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

// --- Desktop: Columns ---
function DesktopKanban({ groups }: { groups: Record<OpportunityStatus, ApiOpportunity[]> }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4" style={{ minWidth: `${(STAGES.length + 1) * 260}px` }}>
        {/* Coluna Vagas sugeridas */}
        <div className="flex w-[250px] flex-shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-blue-500/10 border-blue-500/40 border">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-blue-400">
                Vagas para voce
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-h-[100px]">
            <SuggestedJobsColumn variant="column" />
          </div>
        </div>

        {STAGES.map((stage) => {
          const items = groups[stage.key]
          return (
            <div key={stage.key} className="flex w-[250px] flex-shrink-0 flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${stage.bgColor} ${stage.borderColor} border`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.color.replace("text-", "bg-")}`} />
                  <span className={`text-xs font-semibold ${stage.color}`}>
                    {stage.shortLabel}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[10px] ${stage.color} ${stage.borderColor}`}>
                  {items.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[100px]">
                {items.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} compact />
                ))}
                {items.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                    <span className="text-[10px] text-muted-foreground">Vazio</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

export function KanbanView() {
  const { state } = useOpportunities()
  const isMobile = useIsMobile()

  const groups = useMemo(() => groupByStage(state.opportunities), [state.opportunities])

  return isMobile
    ? <MobileKanban groups={groups} />
    : <DesktopKanban groups={groups} />
}
