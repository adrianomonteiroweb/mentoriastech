"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { SprintHeader } from "./sprint-header"
import { SprintKanban } from "./sprint-kanban"
import { DailyChat } from "./daily-chat"
import { CompanyDocs } from "./company-docs"
import { ScorePanel } from "./score-panel"
import { EvaluationChecklist } from "./evaluation-checklist"
import { WorkspacePanel } from "./workspace/workspace-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type {
  SimEvaluationResult,
  SimSprintHubApi,
  SimTaskStatus,
} from "@/lib/types/database"

interface Props {
  email: string
  sprintId: string
}

export function SprintHub({ email, sprintId }: Props) {
  const [sprint, setSprint] = useState<SimSprintHubApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [evaluationResult, setEvaluationResult] = useState<{
    evaluation: SimEvaluationResult
    scoreDelta: number
  } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/minhas-mentorias/sprints/${sprintId}`)
    const json = await res.json()
    if (res.ok) {
      setSprint(json.data)
      setUnread(json.data.unread_count ?? 0)
    }
    setLoading(false)
  }, [sprintId])

  useEffect(() => {
    load()
  }, [load])

  async function handleMove(taskId: string, toStatus: SimTaskStatus) {
    if (!sprint) return
    const previous = sprint
    // Otimista: aplica local e desfaz se a API recusar
    setSprint({
      ...sprint,
      tasks: sprint.tasks.map((task) =>
        task.id === taskId ? { ...task, status: toStatus } : task,
      ),
    })

    const res = await fetch(
      `/api/minhas-mentorias/sprints/${sprintId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: toStatus }),
      },
    )

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(json?.error || "Não foi possível mover a task")
      setSprint(previous)
      return
    }

    // Feedback imediato: avaliação automática do envio para review
    if (json?.evaluation) {
      setEvaluationResult({
        evaluation: json.evaluation,
        scoreDelta: json.score_delta ?? 0,
      })
    }

    load()
  }

  if (loading) {
    return (
      <MentoriasShell email={email} title="Sprint">
        <div
          className="flex items-center justify-center py-16"
          role="status"
          aria-label="Carregando sprint"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MentoriasShell>
    )
  }

  if (!sprint) {
    return (
      <MentoriasShell email={email} title="Sprint">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-base text-muted-foreground">
            Sprint não encontrada.
          </p>
          <Link
            href="/minhas-mentorias/sprint"
            className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para vagas
          </Link>
        </div>
      </MentoriasShell>
    )
  }

  const isActive = sprint.status === "active"

  return (
    <MentoriasShell email={email} title={sprint.company?.name || "Sprint"}>
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-4">
        <SprintHeader sprint={sprint} />

        <Tabs defaultValue="quadro" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
            <TabsTrigger value="quadro" className="min-h-[44px] text-sm">
              Quadro
            </TabsTrigger>
            <TabsTrigger value="daily" className="min-h-[44px] text-sm gap-1.5">
              Daily
              {unread > 0 && (
                <Badge className="h-5 min-w-5 px-1 justify-center" aria-label={`${unread} mensagens não lidas`}>
                  {unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documentos" className="min-h-[44px] text-sm">
              Documentos
            </TabsTrigger>
            <TabsTrigger value="pontuacao" className="min-h-[44px] text-sm">
              Pontuação
            </TabsTrigger>
            <TabsTrigger value="workspace" className="min-h-[44px] text-sm">
              Workspace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quadro" className="mt-4">
            <SprintKanban
              tasks={sprint.tasks}
              role="mentee"
              disabled={!isActive}
              onMove={handleMove}
            />
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <DailyChat
              endpoint={`/api/minhas-mentorias/sprints/${sprintId}/mensagens`}
              role="mentee"
              tasks={sprint.tasks}
              disabled={!isActive}
              onRead={() => setUnread(0)}
            />
          </TabsContent>

          <TabsContent value="documentos" className="mt-4">
            <CompanyDocs docs={sprint.company_docs} />
          </TabsContent>

          <TabsContent value="pontuacao" className="mt-4">
            <ScorePanel
              endpoint={`/api/minhas-mentorias/sprints/${sprintId}/pontuacao`}
              finalFeedback={sprint.final_feedback}
              finalScore={sprint.final_score}
            />
          </TabsContent>

          <TabsContent value="workspace" className="mt-4">
            <WorkspacePanel
              treeEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/workspace`}
              fileEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/workspace/file`}
              readOnly={!isActive}
            />
          </TabsContent>
        </Tabs>

        <Dialog
          open={Boolean(evaluationResult)}
          onOpenChange={(open) => {
            if (!open) setEvaluationResult(null)
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Task enviada para revisão</DialogTitle>
              <DialogDescription>
                Resultado da avaliação automática do seu workspace
                {evaluationResult && evaluationResult.scoreDelta !== 0 && (
                  <> — <span className="font-semibold text-primary">
                    +{evaluationResult.scoreDelta} pontos
                  </span></>
                )}
                . O Tech Lead ainda vai revisar sua entrega.
              </DialogDescription>
            </DialogHeader>
            {evaluationResult && (
              <EvaluationChecklist evaluation={evaluationResult.evaluation} />
            )}
            <DialogFooter>
              <Button onClick={() => setEvaluationResult(null)}>Entendi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MentoriasShell>
  )
}
