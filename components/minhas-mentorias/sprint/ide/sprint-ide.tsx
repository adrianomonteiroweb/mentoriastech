"use client"

import { useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Code2,
  Files,
  Gauge,
  ListChecks,
  Loader2,
  Lock,
  MessagesSquare,
  Send,
} from "lucide-react"
import { CodeEditor, languageForPath } from "../workspace/code-editor"
import { FileTabs } from "../workspace/file-tabs"
import { FileTree } from "../workspace/file-tree"
import { useSprintWorkspace } from "../workspace/use-sprint-workspace"
import { DailyChat } from "../daily-chat"
import { EvaluationChecklist } from "../evaluation-checklist"
import { SimMarkdown } from "../sim-markdown"
import { TASK_TYPE_LABELS } from "../kanban-card"
import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  SIM_TASK_STATUS_LABELS,
  getAllowedTransitions,
  type SimActorRole,
} from "@/lib/sim/task-transitions"
import type {
  SimEvaluationResult,
  SimSprintHubApi,
  SimTaskStatus,
} from "@/lib/types/database"

type View = "arquivos" | "tasks" | "avaliacao" | "mentor"
type MobilePane = "codigo" | View

function evalPercent(ev: SimEvaluationResult) {
  return ev.totalWeight > 0
    ? Math.round((ev.passedWeight / ev.totalWeight) * 100)
    : 0
}

function gradeText(pct: number) {
  if (pct >= 75) return "text-green-600 dark:text-green-400"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400"
  return "text-destructive"
}

function gradeBg(pct: number) {
  if (pct >= 75) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-destructive"
}

interface Props {
  sprint: SimSprintHubApi
  activeTaskId: string
  role?: SimActorRole
  /** Sprint encerrada / sem edição — IDE em modo leitura. */
  disabled?: boolean
  treeEndpoint: string
  fileEndpoint: string
  dailyEndpoint: string
  unread?: number
  onExit: () => void
  onActiveTaskChange: (taskId: string) => void
  onMove: (taskId: string, toStatus: SimTaskStatus) => void
  onDailyRead?: () => void
}

/**
 * IDE de execução de task (estilo VS Code, theme-aware, responsiva ≥375px).
 * Desktop: title bar + activity bar + side panel + editor + status bar.
 * Mobile: header compacto + conteúdo + navegação inferior (zona do polegar).
 * Reutiliza o workspace real (useSprintWorkspace), a Daily, o checklist de
 * avaliação e as transições de task — nada de mock.
 */
export function SprintIde({
  sprint,
  activeTaskId,
  role = "mentee",
  disabled,
  treeEndpoint,
  fileEndpoint,
  dailyEndpoint,
  unread = 0,
  onExit,
  onActiveTaskChange,
  onMove,
  onDailyRead,
}: Props) {
  const isMobile = useIsMobile()
  const ws = useSprintWorkspace({ treeEndpoint, fileEndpoint, readOnly: disabled })
  const [view, setView] = useState<View>("arquivos")
  const [mobilePane, setMobilePane] = useState<MobilePane>("arquivos")
  const [briefOpen, setBriefOpen] = useState(false)
  const [creating, setCreating] = useState<{
    parent: string | null
    isFolder: boolean
  } | null>(null)
  const [newName, setNewName] = useState("")
  const [deleting, setDeleting] = useState<{
    path: string
    isFolder: boolean
  } | null>(null)
  const [confirmReview, setConfirmReview] = useState(false)

  const activeTask =
    sprint.tasks.find((t) => t.id === activeTaskId) ?? sprint.tasks[0] ?? null
  const allowedTargets = activeTask
    ? getAllowedTransitions(role, activeTask.status)
    : []
  const canReview = !disabled && allowedTargets.includes("review")
  const ev = activeTask?.last_evaluation ?? null
  const companyName = sprint.company?.name ?? sprint.title

  const saveLabel = disabled
    ? "Somente leitura"
    : ws.saveState === "saving"
      ? "Salvando…"
      : ws.saveState === "error"
        ? "Erro ao salvar"
        : ws.saveState === "saved"
          ? "Salvo"
          : "Pronto"

  function handleOpenFile(path: string) {
    ws.openFile(path)
    setView("arquivos")
    setMobilePane("codigo")
  }

  async function handleCreate() {
    if (!creating || !newName.trim()) return
    const ok = await ws.createEntry(creating.parent, newName.trim(), creating.isFolder)
    if (ok) {
      setCreating(null)
      setNewName("")
      setMobilePane("codigo")
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const ok = await ws.deleteEntry(deleting.path)
    if (ok) setDeleting(null)
  }

  function requestMove(toStatus: SimTaskStatus) {
    if (!activeTask) return
    if (toStatus === "review") {
      setConfirmReview(true)
      return
    }
    onMove(activeTask.id, toStatus)
  }

  const activityItems: { id: View; icon: typeof Files; label: string }[] = [
    { id: "arquivos", icon: Files, label: "Arquivos" },
    { id: "tasks", icon: ListChecks, label: "Tasks" },
    { id: "avaliacao", icon: Gauge, label: "Avaliação" },
    { id: "mentor", icon: MessagesSquare, label: "Mentor" },
  ]

  /* ---------- Painéis compartilhados desktop/mobile ---------- */

  const explorerPanel = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Explorer — {companyName}
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <FileTree
          entries={ws.entries}
          selectedPath={ws.activePath}
          readOnly={disabled}
          onSelect={handleOpenFile}
          onCreate={(parent, isFolder) => {
            setCreating({ parent, isFolder })
            setNewName("")
          }}
          onDelete={(path, isFolder) => setDeleting({ path, isFolder })}
        />
      </div>
    </div>
  )

  const tasksPanel = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Task atual
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {activeTask ? (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Task #{activeTask.task_number}
              </p>
              <h2 className="text-base font-semibold text-foreground">
                {activeTask.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[11px]">
                  {TASK_TYPE_LABELS[activeTask.task_type]}
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  {SIM_TASK_STATUS_LABELS[activeTask.status]}
                </Badge>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {activeTask.points} pts
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              {activeTask.description ? (
                <SimMarkdown markdown={activeTask.description} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem descrição — pergunte ao Tech Lead no Mentor.
                </p>
              )}
            </div>

            {sprint.tasks.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trocar de task
                </p>
                {sprint.tasks
                  .filter((t) => t.id !== activeTaskId)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onActiveTaskChange(t.id)}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-muted-foreground/40"
                    >
                      <span className="truncate text-sm text-foreground">
                        #{t.task_number} {t.title}
                      </span>
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {SIM_TASK_STATUS_LABELS[t.status]}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma task.</p>
        )}
      </div>

      {activeTask && !disabled && allowedTargets.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {allowedTargets.map((target) => (
            <Button
              key={target}
              variant={target === "review" ? "default" : "outline"}
              size="sm"
              className="min-h-[44px]"
              onClick={() => requestMove(target)}
            >
              {target === "review"
                ? "Enviar para revisão"
                : SIM_TASK_STATUS_LABELS[target]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  const evaluationPanel = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Avaliação automática
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {ev ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className={`text-4xl font-bold ${gradeText(evalPercent(ev))}`}>
                {evalPercent(ev)}
                <span className="text-lg">%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${gradeBg(evalPercent(ev))}`}
                  style={{ width: `${evalPercent(ev)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Avaliado em {new Date(ev.evaluatedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <EvaluationChecklist evaluation={ev} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeTask?.has_rules ? (
                <>
                  Escreva seu código e toque em{" "}
                  <span className="font-medium text-foreground">
                    Enviar para revisão
                  </span>{" "}
                  para receber a avaliação automática.
                </>
              ) : (
                "Esta task não tem avaliação automática."
              )}
            </p>
          </div>
        )}
      </div>
      {role === "mentee" && (
        <div className="shrink-0 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            className="min-h-[48px] w-full"
            disabled={!canReview}
            onClick={() => setConfirmReview(true)}
          >
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            Enviar para revisão
          </Button>
        </div>
      )}
    </div>
  )

  const mentorPanel = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Daily com o Tech Lead
      </div>
      <div className="min-h-0 flex-1 p-3 pt-0">
        <DailyChat
          endpoint={dailyEndpoint}
          role={role}
          tasks={sprint.tasks}
          disabled={disabled}
          onRead={onDailyRead}
          fill
        />
      </div>
    </div>
  )

  function sidePanelFor(v: View) {
    if (v === "arquivos") return explorerPanel
    if (v === "tasks") return tasksPanel
    if (v === "avaliacao") return evaluationPanel
    return mentorPanel
  }

  const tabsStrip = (
    <FileTabs
      tabs={ws.tabs}
      activePath={ws.activePath}
      onActivate={ws.setActivePath}
      onClose={ws.closeTab}
    />
  )

  const editorArea = (
    <div className="min-h-0 flex-1">
      {ws.activePath != null && ws.contents[ws.activePath] !== undefined ? (
        <CodeEditor
          path={ws.activePath}
          value={ws.contents[ws.activePath]}
          readOnly={disabled}
          onChange={(value) => ws.handleChange(ws.activePath!, value)}
          compact={isMobile}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {ws.entries.length === 0 && !disabled
            ? "Crie a estrutura do projeto conforme o documento do Tech Lead (aba Arquivos)."
            : "Selecione um arquivo em Arquivos."}
        </div>
      )}
    </div>
  )

  const dialogs = (
    <>
      <Dialog
        open={Boolean(creating)}
        onOpenChange={(open) => {
          if (!open) setCreating(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creating?.isFolder ? "Nova pasta" : "Novo arquivo"}
            </DialogTitle>
            <DialogDescription>
              {creating?.parent
                ? `Dentro de ${creating.parent}/`
                : "Na raiz do projeto"}
              {!creating?.isFolder && " — use a extensão correta (ex.: service.ts)"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={creating?.isFolder ? "controllers" : "app.ts"}
              aria-label="Nome"
              pattern="[\w\-./]+"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreating(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!newName.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deleting?.isFolder ? "pasta" : "arquivo"} {deleting?.path}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.isFolder
                ? "Todos os arquivos dentro dela também serão excluídos."
                : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmReview}
        onOpenChange={(open) => {
          if (!open) setConfirmReview(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Enviar Task #{activeTask?.task_number} para revisão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O Tech Lead vai revisar sua entrega. A avaliação automática roda
              agora e o resultado aparece na aba Avaliação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ainda não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (activeTask) onMove(activeTask.id, "review")
                setConfirmReview(false)
                setView("avaliacao")
                setMobilePane("avaliacao")
              }}
            >
              Enviar para revisão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  if (ws.loading) {
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando IDE" />
        <Button variant="ghost" size="sm" onClick={onExit}>
          Sair da IDE
        </Button>
      </div>
    )
  }

  /* =========================== MOBILE =========================== */
  if (isMobile) {
    const paneTitles: Record<MobilePane, string> = {
      codigo: ws.activePath?.split("/").pop() ?? "Editor",
      arquivos: "Arquivos",
      tasks: "Tasks",
      avaliacao: "Avaliação",
      mentor: "Mentor",
    }

    const navItems: {
      id: MobilePane
      icon: typeof Files
      label: string
      primary?: boolean
    }[] = [
      { id: "codigo", icon: Code2, label: "Código" },
      { id: "arquivos", icon: Files, label: "Arquivos" },
      { id: "tasks", icon: ListChecks, label: "Tasks" },
      { id: "mentor", icon: MessagesSquare, label: "Mentor" },
      { id: "avaliacao", icon: Gauge, label: "Avaliar", primary: true },
    ]

    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        {/* Barra superior: só informação + sair (zona alta) */}
        <header className="flex min-h-[3rem] shrink-0 items-center gap-1 border-b border-border bg-secondary px-2 pt-[env(safe-area-inset-top)]">
          <button
            onClick={onExit}
            aria-label="Sair da IDE"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-medium">{paneTitles[mobilePane]}</span>
          <span className="ml-auto truncate pl-2 text-[11px] text-muted-foreground">
            {companyName}
          </span>
        </header>

        {/* Conteúdo */}
        <div className="relative min-h-0 flex-1">
          {mobilePane === "codigo" ? (
            <div className="flex h-full flex-col">
              {tabsStrip}
              {editorArea}

              {briefOpen && activeTask && (
                <div className="absolute inset-x-0 bottom-0 top-9 z-20 flex flex-col bg-card">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BookOpen className="h-4 w-4 text-primary" /> Enunciado — Task #
                      {activeTask.task_number}
                    </span>
                    <button
                      onClick={() => setBriefOpen(false)}
                      aria-label="Fechar enunciado"
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
                    {activeTask.description ? (
                      <SimMarkdown markdown={activeTask.description} />
                    ) : (
                      <p className="text-muted-foreground">Sem descrição.</p>
                    )}
                  </div>
                </div>
              )}

              {!briefOpen && activeTask && (
                <button
                  onClick={() => setBriefOpen(true)}
                  className="absolute bottom-4 right-4 z-10 flex h-12 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-foreground shadow-lg ring-1 ring-border"
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                  Enunciado
                </button>
              )}
            </div>
          ) : (
            <div className="h-full">{sidePanelFor(mobilePane)}</div>
          )}
        </div>

        {/* Navegação inferior — zona do polegar; ação primária ("Avaliar") à direita */}
        <nav
          className="grid shrink-0 grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
          aria-label="Navegação da IDE"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const active = mobilePane === item.id
            const badge =
              item.id === "avaliacao" && ev
                ? `${evalPercent(ev)}%`
                : item.id === "mentor" && unread > 0
                  ? String(unread)
                  : null
            return (
              <button
                key={item.id}
                onClick={() => setMobilePane(item.id)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  item.primary
                    ? active
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/90 text-primary-foreground"
                    : active
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {active && !item.primary && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-b bg-primary" />
                )}
                <Icon className="h-6 w-6" />
                <span>{item.label}</span>
                {badge && (
                  <span className="absolute right-1.5 top-2 rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {dialogs}
      </div>
    )
  }

  /* =========================== DESKTOP =========================== */
  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Title bar */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-secondary px-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onExit}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Sair da IDE
        </Button>
        <span className="truncate px-2 text-xs text-muted-foreground">
          {companyName}
          {activeTask ? ` — Task #${activeTask.task_number} · ${activeTask.title}` : ""}
        </span>
        <div className="w-24 shrink-0" />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav
          className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-secondary py-2"
          aria-label="Painéis da IDE"
        >
          {activityItems.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            const badge = item.id === "mentor" && unread > 0 ? unread : null
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "true" : undefined}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon className="h-5 w-5" />
                {badge && (
                  <span className="absolute right-1 top-1 rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Side panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
          {sidePanelFor(view)}
        </aside>

        {/* Editor */}
        <main className="flex min-w-0 flex-1 flex-col">
          {tabsStrip}

          <div className="flex items-center gap-2 border-b border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">
              {ws.activePath ? ws.activePath.split("/").join("  ›  ") : "—"}
            </span>
            {disabled && (
              <span className="ml-2 flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                <Lock className="h-3 w-3" /> somente leitura
              </span>
            )}
          </div>

          {editorArea}

          {activeTask && (
            <details className="shrink-0 border-t border-border bg-card text-[13px]">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Enunciado — Task #{activeTask.task_number} · {activeTask.title}
              </summary>
              <div className="max-h-52 overflow-y-auto px-4 pb-4">
                {activeTask.description ? (
                  <SimMarkdown markdown={activeTask.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem descrição.</p>
                )}
              </div>
            </details>
          )}
        </main>
      </div>

      {/* Status bar */}
      <footer className="flex h-6 shrink-0 items-center justify-between bg-primary px-3 font-mono text-[11px] text-primary-foreground">
        <div className="flex items-center gap-3">
          <span>
            Dia {sprint.current_day} de {sprint.duration_days}
          </span>
          {activeTask && <span>Task #{activeTask.task_number}</span>}
          {activeTask && <span>{activeTask.points} pts</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>{saveLabel}</span>
          {ev && <span>Última nota: {evalPercent(ev)}%</span>}
          {ws.activePath && <span>{languageForPath(ws.activePath)}</span>}
          <span>UTF-8</span>
        </div>
      </footer>

      {dialogs}
    </div>
  )
}
