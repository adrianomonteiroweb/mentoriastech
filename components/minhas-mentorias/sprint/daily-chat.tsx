"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, MessageSquarePlus, Send, TrendingDown, TrendingUp } from "lucide-react"
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
  SimScoreCategory,
  SimSprintTaskApi,
} from "@/lib/types/database"
import type { SimActorRole } from "@/lib/sim/task-transitions"

const QUICK_PROMPTS = [
  "Hoje vou trabalhar em: ",
  "Estou bloqueado em: ",
  "Dúvida: ",
  "Concluí: ",
]

const CATEGORY_LABELS: Record<SimScoreCategory, string> = {
  structure: "Estrutura",
  code: "Código",
  tests: "Testes",
  architecture: "Arquitetura",
  communication: "Comunicação",
  general: "Geral",
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
}: Props) {
  const [messages, setMessages] = useState<SimDailyMessageApi[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
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
      if (adjustment) {
        setAdjustment(null)
        onScoreChanged?.()
      }
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
    <div className="flex flex-col gap-3">
      <div
        className="flex max-h-[55vh] min-h-[200px] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card p-3"
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
                    <p className="text-xs font-medium text-muted-foreground px-1">
                      {message.author_role === "mentor"
                        ? "Tech Lead"
                        : message.author_name || "Mentorado"}
                      {message.task_number != null &&
                        ` · sobre a Task #${message.task_number}`}
                    </p>
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
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label="Sugestões de mensagem"
            >
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setBody((current) => current || prompt)}
                  className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors min-h-[36px]"
                >
                  {prompt.replace(": ", "")}
                </button>
              ))}
            </div>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              role === "mentee"
                ? "Escreva sua daily: progresso, bloqueios, dúvidas…"
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
