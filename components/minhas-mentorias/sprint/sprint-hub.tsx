"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Code2, Loader2, Trash2 } from "lucide-react"
import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { SprintHeader } from "./sprint-header"
import { SprintKanban } from "./sprint-kanban"
import { SprintRituals } from "./sprint-rituals"
import { ScrumOnboarding } from "./scrum-onboarding"
import { DailyChat } from "./daily-chat"
import { CompanyDocs } from "./company-docs"
import { ScorePanel } from "./score-panel"
import { EvaluationChecklist } from "./evaluation-checklist"
import { SprintIde } from "./ide/sprint-ide"
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
  SimSprintTaskApi,
  SimTaskStatus,
} from "@/lib/types/database"

interface Props {
  email: string
  sprintId: string
}

/** Task inicial ao abrir a IDE pela aba: a em andamento → senão a próxima → senão a 1ª. */
function pickIdeTask(tasks: SimSprintTaskApi[]): SimSprintTaskApi | null {
  return (
    tasks.find((t) => t.status === "doing") ??
    tasks.find((t) => t.status === "todo") ??
    tasks[0] ??
    null
  )
}

export function SprintHub({ email, sprintId }: Props) {
  const router = useRouter()
  const [sprint, setSprint] = useState<SimSprintHubApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [ideTaskId, setIdeTaskId] = useState<string | null>(null)
  // Recarrega os rituais (eventos ágeis) quando o mentee mexe no quadro/daily.
  const [ritualsKey, setRitualsKey] = useState(0)
  const [evaluationResult, setEvaluationResult] = useState<{
    evaluation: SimEvaluationResult
    scoreDelta: number
  } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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

  async function handleMove(
    taskId: string,
    toStatus: SimTaskStatus,
    showEvaluationDialog = true,
  ) {
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

    // Feedback imediato: avaliação automática do envio para review.
    // Na IDE o resultado aparece no próprio painel Avaliação, então o
    // diálogo é suprimido para não sobrepor a interface imersiva.
    if (showEvaluationDialog && json?.evaluation) {
      setEvaluationResult({
        evaluation: json.evaluation,
        scoreDelta: json.score_delta ?? 0,
      })
    }

    setRitualsKey((key) => key + 1)
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

  async function handleCancelInscription() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/minhas-mentorias/sprints/${sprintId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error || "Erro ao cancelar inscrição")
        return
      }
      toast.success("Inscrição cancelada")
      router.push("/minhas-mentorias/sprint")
    } finally {
      setCancelling(false)
    }
  }

  const isActive = sprint.status === "active"
  const canCancel = sprint.status === "active" || sprint.status === "completed"

  return (
    <>
    <MentoriasShell email={email} title={sprint.company?.name || "Sprint"}>
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-4">
        <SprintHeader sprint={sprint} />

        <div className="flex items-center justify-between">
          <ScrumOnboarding />
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
              Cancelar inscrição
            </Button>
          )}
        </div>

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
            <TabsTrigger value="ide" className="min-h-[44px] text-sm gap-1.5">
              <Code2 className="h-4 w-4" aria-hidden="true" />
              IDE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quadro" className="mt-4 flex flex-col gap-4">
            {sprint.tasks.length > 0 && (
              <SprintRituals
                tasks={sprint.tasks}
                currentDay={sprint.current_day}
                scoreEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/pontuacao`}
                refreshKey={ritualsKey}
              />
            )}
            <SprintKanban
              tasks={sprint.tasks}
              role="mentee"
              disabled={!isActive}
              onMove={handleMove}
              onEnterIde={(task) => setIdeTaskId(task.id)}
            />
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <DailyChat
              endpoint={`/api/minhas-mentorias/sprints/${sprintId}/mensagens`}
              role="mentee"
              tasks={sprint.tasks}
              disabled={!isActive}
              onRead={() => setUnread(0)}
              onSent={() => setRitualsKey((key) => key + 1)}
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

          <TabsContent value="ide" className="mt-4">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Code2 className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Programe sua task na IDE
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Editor completo com seus arquivos, o enunciado da task, a daily
                  com o Tech Lead e a avaliação automática — tudo em tela cheia.
                </p>
              </div>
              <Button
                size="lg"
                disabled={sprint.tasks.length === 0}
                onClick={() => setIdeTaskId(pickIdeTask(sprint.tasks)?.id ?? null)}
              >
                <Code2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Abrir IDE
              </Button>
              {sprint.tasks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma task na sprint ainda.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar inscrição</DialogTitle>
              <DialogDescription>
                Isso vai apagar sua sprint e todos os dados (tasks, mensagens,
                pontuação, arquivos). Você poderá se candidatar novamente depois.
                Essa ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={cancelling}
                onClick={handleCancelInscription}
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirmar exclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

    {ideTaskId && (
      <SprintIde
        sprint={sprint}
        activeTaskId={ideTaskId}
        role="mentee"
        disabled={!isActive}
        treeEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/workspace`}
        fileEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/workspace/file`}
        dailyEndpoint={`/api/minhas-mentorias/sprints/${sprintId}/mensagens`}
        unread={unread}
        onExit={() => setIdeTaskId(null)}
        onActiveTaskChange={(id) => setIdeTaskId(id)}
        onMove={(taskId, toStatus) => handleMove(taskId, toStatus, false)}
        onDailyRead={() => setUnread(0)}
      />
    )}
    </>
  )
}
