"use client"

import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { KanbanView } from "./kanban-view"
import { ListView } from "./list-view"
import {
  OpportunitiesProvider,
  useOpportunities,
} from "./opportunities-context"
import { OpportunityDetail } from "./opportunity-detail"
import { QuickCreateModal } from "./quick-create-modal"
import { StatsSummary } from "./stats-summary"
import { TodayView } from "./today-view"
import type { ApiOpportunity, TodayAction, ViewTab, WeeklyStats } from "./types"

interface Props {
  email: string
  initialOpportunities: ApiOpportunity[]
  initialTodayActions: TodayAction[]
  initialStats: WeeklyStats
}

function PanelContent({ email }: { email: string }) {
  const { state, dispatch } = useOpportunities()

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link
              href="/minhas-mentorias/historico"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar para Minhas Mentorias
            </Link>
            <h1 className="text-2xl font-semibold text-foreground">
              Painel de Oportunidades
            </h1>
            <p className="text-xs text-muted-foreground">
              Acesso via {email}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => dispatch({ type: "OPEN_CREATE" })}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </header>

        {/* Stats */}
        <StatsSummary stats={state.stats} />

        {/* Tabs */}
        <Tabs
          value={state.activeTab}
          onValueChange={(v) => dispatch({ type: "SET_TAB", tab: v as ViewTab })}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="mt-4">
            <TodayView />
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <KanbanView />
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <ListView />
          </TabsContent>
        </Tabs>

        {/* Modals & panels */}
        <QuickCreateModal />
        <OpportunityDetail />
      </div>
    </main>
  )
}

export function OpportunitiesPanel({
  email,
  initialOpportunities,
  initialTodayActions,
  initialStats,
}: Props) {
  return (
    <OpportunitiesProvider
      initialOpportunities={initialOpportunities}
      initialTodayActions={initialTodayActions}
      initialStats={initialStats}
    >
      <PanelContent email={email} />
    </OpportunitiesProvider>
  )
}
