"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  ClipboardList,
  HelpCircle,
  Loader2,
  MessageSquarePlus,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type {
  SimDailyMessageApi,
  SimDailyMessageKind,
  SimScoreCategory,
  SimSprintTaskApi,
} from "@/lib/types/database"
import type { SimActorRole } from "@/lib/sim/task-transitions"

/**
 * Os 3 tipos de mensagem da daily (os 3 pilares do standup do SCRUM +
 * a dúvida do contexto de mentoria). Só Impedimento e Dúvida vão para o
 * inbox do mentor; Progresso é documentação e fica só na timeline.
 */
const KIND_META: Record<
  SimDailyMessageKind,
  {
    label: string
    icon: typeof ClipboardList
    placeholder: string
    /** Micro-explicação (ensina o pilar do SCRUM em 1 linha). */
    hint: string
    /** Classe de cor do badge/seletor ativo. */
    tone: string
  }
> = {
  daily: {
    label: "Progresso",
    icon: ClipboardList,
    placeholder: "O que você fez e o que fará hoje…",
    hint: "Sua daily: documente avanços e o próximo passo. Não precisa de resposta.",
    tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  impediment: {
    label: "Impedimento",
    icon: AlertTriangle,
    placeholder: "O que está te travando? Descreva o bloqueio…",
    hint: "Algo te bloqueia? Sinalize cedo — o Tech Lead recebe no inbox.",
    tone: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  },
  doubt: {
    label: "Dúvida",
    icon: HelpCircle,
    placeholder: "Sua pergunta ao Tech Lead…",
    hint: "Uma pergunta pontual pro Tech Lead — aparece no inbox dele.",
    tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
}

const KIND_ORDER: SimDailyMessageKind[] = ["daily", "impediment", "doubt"]

/** Badge do tipo de mensagem (mostrado nas bolhas de Impedimento/Dúvida). */
function KindBadge({ kind }: { kind: SimDailyMessageKind }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.tone}`}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

const CATEGORY_LABELS: Record<SimScoreCategory, string> = {
  structure: "Estrutura",
  code: "Código",
  tests: "Testes",
  architecture: "Arquitetura",
  communication: "Comunicação",
  general: "Geral",
  agile: "Metodologia Ágil",
}

interface Adjustment {
  delta: number
  reason: string
  category: SimScoreCategory
}

interface Props {
  endpoint: string
  role: SimActorRole
  tasks: SimSprintTaskApi[]
  disabled?: boolean
  onRead?: () => void
  onScoreChanged?: () => void
  /** Chamado após enviar uma mensagem com sucesso (ex.: atualizar rituais). */
  onSent?: () => void
  /** Preenche a altura do container (usado dentro da IDE) em vez de max-h fixo. */
  fill?: boolean
}

/**
 * Daily assíncrona: mensagens agrupadas por dia da sprint, mentor aparece
 * como "Tech Lead", ajustes de pontuação aparecem como chip na mensagem.
 * Atualiza por polling (~20s).
 */
export function DailyChat({
  endpoint,
  role,
  tasks,
  disabled,
  onRead,
  onScoreChanged,
  onSent,
  fill,
}: Props) {
  const [messages, setMessages] = useState<SimDailyMessageApi[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [kind, setKind] = useState<SimDailyMessageKind>("daily")
  const [taskId, setTaskId] = useState<string>("")
  const [sending, setSending] = useState(false)
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(true)

  const load = useCallback(
    async (markRead: boolean) => {
      const res = await fetch(
        markRead ? `${endpoint}?mark_read=1` : endpoint,
      )
      const json = await res.json()
      if (res.ok) {
        setMessages(json.data || [])
        if (markRead) onRead?.()
      }
      setLoading(false)
    },
    [endpoint, onRead],
  )

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(true), 20_000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (loading) return
    bottomRef.current?.scrollIntoView({
      behavior: firstLoad.current ? "auto" : "smooth",
      block: "nearest",
    })
    firstLoad.current = false
  }, [messages.length, loading])

  async function handleSend() {
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const payload: Record<string, unknown> = {
        body: body.trim(),
        task_id: taskId || null,
        kind: role === "mentee" ? kind : "daily",
      }
      if (role === "mentor" && adjustment) {
        payload.adjustment = adjustment
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao enviar mensagem")
        return
      }
      setBody("")
      setTaskId("")
      setKind("daily")
      if (adjustment) {
        setAdjustment(null)
        onScoreChanged?.()
      }
      onSent?.()
      await load(false)
    } finally {
      setSending(false)
    }
  }

  const groups: { day: number; items: SimDailyMessageApi[] }[] = []
  for (const message of messages) {
    const last = groups[groups.length - 1]
    if (last && last.day === message.sprint_day) {
      last.items.push(message)
    } else {
      groups.push({ day: message.sprint_day, items: [message] })
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${fill ? "h-full" : ""}`}>
      <div
        className={`flex flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card p-3 ${
          fill ? "min-h-0 flex-1" : "max-h-[55vh] min-h-[200px]"
        }`}
        role="log"
        aria-label="Conversa da daily"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquarePlus
              className="mx-auto h-8 w-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="mt-2 text-base text-muted-foreground">
              {role === "mentee"
                ? "Conte ao Tech Lead o que você vai fazer hoje."
                : "Nenhuma mensagem do mentorado ainda."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.day} className="flex flex-col gap-2">
              <p className="sticky top-0 z-10 mx-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                Dia {group.day}
              </p>
              {group.items.map((message) => {
                const mine = message.author_role === role
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      mine ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {message.author_role === "mentor"
                          ? "Tech Lead"
                          : message.author_name || "Mentorado"}
                        {message.task_number != null &&
                          ` · sobre a Task #${message.task_number}`}
                      </p>
                      {message.author_role === "mentee" &&
                        message.kind !== "daily" && (
                          <KindBadge kind={message.kind} />
                        )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-base leading-relaxed whitespace-pre-wrap break-words ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      }`}
                    >
                      {message.body}
                    </div>
                    {message.score_event && (
                      <p
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          message.score_event.delta > 0
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {message.score_event.delta > 0 ? (
                          <TrendingUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="h-3 w-3" aria-hidden="true" />
                        )}
                        {message.score_event.delta > 0 ? "+" : ""}
                        {message.score_event.delta} ·{" "}
                        {message.score_event.reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!disabled && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          {role === "mentee" && (
            <div className="flex flex-col gap-1.5">
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary/40 p-1"
                role="group"
                aria-label="Tipo de mensagem"
              >
                {KIND_ORDER.map((k) => {
                  const meta = KIND_META[k]
                  const Icon = meta.icon
                  const active = kind === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      aria-pressed={active}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? `border ${meta.tone}`
                          : "border border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
              <p className="px-1 text-[11px] text-muted-foreground">
                {KIND_META[kind].hint}
              </p>
            </div>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              role === "mentee"
                ? KIND_META[kind].placeholder
                : "Responda como Tech Lead: dicas, feedback, direcionamento…"
            }
            rows={3}
            maxLength={4000}
            aria-label="Nova mensagem"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={taskId || "none"} onValueChange={(v) => setTaskId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-auto min-w-[160px] h-10 text-sm" aria-label="Vincular a uma task">
                <SelectValue placeholder="Sobre uma task?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem task específica</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    Task #{task.task_number} — {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {role === "mentor" && (
              <Popover open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={adjustment ? "default" : "outline"}
                    size="sm"
                    className="h-10"
                  >
                    {adjustment
                      ? `${adjustment.delta > 0 ? "+" : ""}${adjustment.delta} pts`
                      : "Ajustar pontuação"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 flex flex-col gap-3">
                  <p className="text-sm font-semibold">Ajuste de pontuação</p>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="adj-delta" className="text-xs font-medium text-muted-foreground">
                      Pontos (-50 a +50)
                    </label>
                    <Input
                      id="adj-delta"
                      type="number"
                      min={-50}
                      max={50}
                      value={adjustment?.delta ?? ""}
                      onChange={(e) =>
                        setAdjustment((current) => ({
                          delta: Number(e.target.value) || 0,
                          reason: current?.reason ?? "",
                          category: current?.category ?? "general",
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="adj-reason" className="text-xs font-medium text-muted-foreground">
                      Motivo (obrigatório)
                    </label>
                    <Input
                      id="adj-reason"
                      value={adjustment?.reason ?? ""}
                      placeholder="Ex.: Boa separação de responsabilidades"
                      onChange={(e) =>
                        setAdjustment((current) => ({
                          delta: current?.delta ?? 0,
                          reason: e.target.value,
                          category: current?.category ?? "general",
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Categoria
                    </label>
                    <Select
                      value={adjustment?.category ?? "general"}
                      onValueChange={(value) =>
                        setAdjustment((current) => ({
                          delta: current?.delta ?? 0,
                          reason: current?.reason ?? "",
                          category: value as SimScoreCategory,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAdjustment(null)
                        setAdjustmentOpen(false)
                      }}
                    >
                      Remover ajuste
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        !adjustment ||
                        adjustment.delta === 0 ||
                        adjustment.reason.trim().length < 3
                      }
                      onClick={() => setAdjustmentOpen(false)}
                    >
                      Anexar à mensagem
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="ml-auto min-h-[44px]"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" aria-hidden="true" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
