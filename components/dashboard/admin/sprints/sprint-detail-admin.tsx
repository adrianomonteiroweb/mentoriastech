"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Code2, Flag, Loader2, Plus, Trash2 } from "lucide-react"
import { SprintHeader } from "@/components/minhas-mentorias/sprint/sprint-header"
import { SprintKanban } from "@/components/minhas-mentorias/sprint/sprint-kanban"
import { DailyChat } from "@/components/minhas-mentorias/sprint/daily-chat"
import { ScorePanel } from "@/components/minhas-mentorias/sprint/score-panel"
import { SprintIde } from "@/components/minhas-mentorias/sprint/ide/sprint-ide"
import { TemplateTaskForm, type TaskFormValues } from "./template-task-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type {
  SimSprintHubApi,
  SimSprintTaskApi,
  SimTaskStatus,
} from "@/lib/types/database"

interface SprintDetail extends SimSprintHubApi {
  mentee: { id: string; full_name: string | null; email: string } | null
}

interface Props {
  sprintId: string
  basePath: string
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

export function SprintDetailAdmin({ sprintId, basePath }: Props) {
  const router = useRouter()
  const [sprint, setSprint] = useState<SprintDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("quadro")
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [finalFeedback, setFinalFeedback] = useState("")
  const [finalScore, setFinalScore] = useState("")
  const [closing, setClosing] = useState(false)
  const [scoreKey, setScoreKey] = useState(0)
  const [ideTaskId, setIdeTaskId] = useState<string | null>(null)
  const [cancelInscriptionOpen, setCancelInscriptionOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/sprints/${sprintId}`)
    const json = await res.json()
    if (res.ok) setSprint(json.data)
    setLoading(false)
  }, [sprintId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab")
    if (wanted === "daily" || wanted === "pontuacao" || wanted === "ide") setTab(wanted)
  }, [])

  useEffect(() => {
    if (tab === "ide" && sprint && sprint.tasks.length > 0 && !ideTaskId) {
      setIdeTaskId(pickIdeTask(sprint.tasks)?.id ?? null)
    }
  }, [tab, sprint, ideTaskId])

  async function handleMove(taskId: string, toStatus: SimTaskStatus) {
    if (!sprint) return
    const previous = sprint
    setSprint({
      ...sprint,
      tasks: sprint.tasks.map((task) =>
        task.id === taskId ? { ...task, status: toStatus } : task,
      ),
    })

    const res = await fetch(`/api/admin/sprints/${sprintId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_status: toStatus }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error || "Não foi possível mover a task")
      setSprint(previous)
      return
    }

    load()
  }

  async function handleReevaluate(taskId: string) {
    const res = await fetch(
      `/api/admin/sprints/${sprintId}/tasks/${taskId}/evaluate`,
      { method: "POST" },
    )
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao reavaliar task")
      return
    }
    const passed = (json.evaluation?.results || []).filter(
      (r: { passed: boolean }) => r.passed,
    ).length
    const total = json.evaluation?.results?.length ?? 0
    toast.success(
      `Avaliação executada: ${passed}/${total} critérios · ${json.score_delta >= 0 ? "+" : ""}${json.score_delta} pts`,
    )
    setScoreKey((key) => key + 1)
    load()
  }

  async function handleSolutionChange(
    taskId: string,
    patch: { solution_markdown?: string; solution_released?: boolean },
  ) {
    const res = await fetch(`/api/admin/sprints/${sprintId}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(json?.error || "Erro ao salvar gabarito")
      return
    }
    toast.success(
      patch.solution_released === undefined
        ? "Gabarito salvo"
        : patch.solution_released
          ? "Gabarito liberado para o mentorado"
          : "Gabarito ocultado",
    )
    load()
  }

  async function handleCreateTask(values: TaskFormValues) {
    const res = await fetch(`/api/admin/sprints/${sprintId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao criar task")
      return false
    }
    toast.success("Task criada na sprint")
    setNewTaskOpen(false)
    load()
    return true
  }

  async function handleClose(status: "completed" | "cancelled") {
    setClosing(true)
    try {
      const res = await fetch(`/api/admin/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          final_feedback: finalFeedback,
          final_score: finalScore ? Number(finalScore) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao encerrar sprint")
        return
      }
      toast.success(
        status === "completed" ? "Sprint concluída!" : "Sprint cancelada",
      )
      setCloseOpen(false)
      load()
    } finally {
      setClosing(false)
    }
  }

  async function handleCancelInscription() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/sprints/${sprintId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error || "Erro ao cancelar inscrição")
        return
      }
      toast.success("Inscrição cancelada e dados apagados")
      router.push(basePath)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Carregando sprint">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!sprint) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">
        Sprint não encontrada.
      </p>
    )
  }

  const isActive = sprint.status === "active"

  return (
    <>
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Todas as sprints
        </Link>
        <p className="text-sm text-muted-foreground">
          Mentorado:{" "}
          <span className="font-medium text-foreground">
            {sprint.mentee?.full_name || sprint.mentee?.email}
          </span>
        </p>
        <div className="flex gap-2">
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[40px]"
                onClick={() => setNewTaskOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                Nova task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[40px]"
                onClick={() => setCloseOpen(true)}
              >
                <Flag className="h-4 w-4 mr-1" aria-hidden="true" />
                Encerrar sprint
              </Button>
            </>
          )}
          {(isActive || sprint?.status === "completed") && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelInscriptionOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
              Cancelar inscrição
            </Button>
          )}
        </div>
      </div>

      <SprintHeader sprint={sprint} />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
          <TabsTrigger value="quadro" className="min-h-[44px]">
            Quadro
          </TabsTrigger>
          <TabsTrigger value="daily" className="min-h-[44px]">
            Daily
          </TabsTrigger>
          <TabsTrigger value="pontuacao" className="min-h-[44px]">
            Pontuação
          </TabsTrigger>
          <TabsTrigger value="ide" className="min-h-[44px] gap-1.5">
            <Code2 className="h-4 w-4" aria-hidden="true" />
            IDE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quadro" className="mt-4">
          <SprintKanban
            tasks={sprint.tasks}
            role="mentor"
            disabled={!isActive}
            onMove={handleMove}
            onReevaluate={handleReevaluate}
            onEnterIde={(task) => setIdeTaskId(task.id)}
            onSolutionChange={handleSolutionChange}
          />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <DailyChat
            endpoint={`/api/admin/sprints/${sprintId}/mensagens`}
            role="mentor"
            tasks={sprint.tasks}
            disabled={!isActive}
            onScoreChanged={() => {
              setScoreKey((key) => key + 1)
              load()
            }}
          />
        </TabsContent>

        <TabsContent value="pontuacao" className="mt-4">
          <ScorePanel
            key={scoreKey}
            endpoint={`/api/admin/sprints/${sprintId}/pontuacao`}
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
                Abrir o workspace do mentorado na IDE
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Veja os arquivos, o enunciado das tasks e a avaliação em tela
                cheia — a mesma IDE acessível pelo card do quadro.
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

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova task na sprint</DialogTitle>
            <DialogDescription>
              A task entra direto no quadro do mentorado.
            </DialogDescription>
          </DialogHeader>
          <TemplateTaskForm onSubmit={handleCreateTask} submitLabel="Criar task" />
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar sprint</DialogTitle>
            <DialogDescription>
              Deixe um feedback final para o mentorado — pontos fortes, pontos a
              melhorar e recomendações.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="final-score" className="text-sm font-medium">
                Nota final (0 a 100, opcional)
              </label>
              <Input
                id="final-score"
                type="number"
                min={0}
                max={100}
                value={finalScore}
                onChange={(e) => setFinalScore(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="final-feedback" className="text-sm font-medium">
                Feedback final
              </label>
              <Textarea
                id="final-feedback"
                rows={5}
                maxLength={20_000}
                value={finalFeedback}
                onChange={(e) => setFinalFeedback(e.target.value)}
                placeholder="Ex.: Boa evolução na separação de responsabilidades…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={closing}
              onClick={() => handleClose("cancelled")}
            >
              Cancelar sprint
            </Button>
            <Button disabled={closing} onClick={() => handleClose("completed")}>
              {closing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Concluir sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelInscriptionOpen} onOpenChange={setCancelInscriptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar inscrição</DialogTitle>
            <DialogDescription>
              Isso vai apagar a sprint e todos os dados (tasks, mensagens,
              pontuação, arquivos). A candidatura voltará ao estado cancelado.
              Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelInscriptionOpen(false)}>
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
    </div>

    {ideTaskId && (
      <SprintIde
        sprint={sprint}
        activeTaskId={ideTaskId}
        role="mentor"
        disabled={!isActive}
        treeEndpoint={`/api/admin/sprints/${sprintId}/workspace`}
        fileEndpoint={`/api/admin/sprints/${sprintId}/workspace`}
        dailyEndpoint={`/api/admin/sprints/${sprintId}/mensagens`}
        onExit={() => setIdeTaskId(null)}
        onActiveTaskChange={(id) => setIdeTaskId(id)}
        onMove={handleMove}
      />
    )}
    </>
  )
}
