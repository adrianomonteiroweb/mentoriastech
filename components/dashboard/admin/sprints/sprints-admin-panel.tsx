"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, ClipboardList } from "lucide-react"
import { SprintsMonitor } from "./sprints-monitor"
import { ApplicationsTable } from "./applications-table"
import { DoubtsInbox } from "./doubts-inbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Props {
  basePath: string
  /** Empresa/templates são curadoria — só aparecem para admin */
  showManagement?: boolean
}

export function SprintsAdminPanel({ basePath, showManagement }: Props) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [doubtCount, setDoubtCount] = useState(0)

  // Badge da aba Dúvidas precisa do count antes de a aba ser aberta
  useEffect(() => {
    fetch("/api/admin/sprints/doubts")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return
        setDoubtCount(
          (json.data as { messages: unknown[] }[]).reduce(
            (sum, group) => sum + group.messages.length,
            0,
          ),
        )
      })
      .catch(() => {})
  }, [refreshKey])

  return (
    <div className="flex flex-col gap-4">
      {showManagement && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="min-h-[40px]">
            <Link href="/admin/sprints/empresa">
              <Building2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Empresas Fictícias
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="min-h-[40px]">
            <Link href="/admin/sprints/templates">
              <ClipboardList className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Vagas & Templates
            </Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
          <TabsTrigger value="monitor" className="min-h-[44px]">
            Acompanhamento
          </TabsTrigger>
          <TabsTrigger value="candidaturas" className="min-h-[44px]">
            Candidaturas
          </TabsTrigger>
          <TabsTrigger value="duvidas" className="min-h-[44px] gap-1.5">
            Dúvidas & impedimentos
            {doubtCount > 0 && (
              <Badge
                className="h-5 min-w-5 px-1 justify-center"
                aria-label={`${doubtCount} mensagens aguardando resposta`}
              >
                {doubtCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-4">
          <SprintsMonitor basePath={basePath} refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="candidaturas" className="mt-4">
          <ApplicationsTable
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((key) => key + 1)}
          />
        </TabsContent>

        <TabsContent value="duvidas" className="mt-4">
          <DoubtsInbox
            basePath={basePath}
            refreshKey={refreshKey}
            onCount={setDoubtCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
