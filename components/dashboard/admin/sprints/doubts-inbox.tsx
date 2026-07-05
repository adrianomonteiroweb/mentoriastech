"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Inbox,
  Loader2,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { SimScoreCategory } from "@/lib/types/database"

interface DoubtMessage {
  id: string
  kind: string
  body: string
  sprint_day: number
  created_at: string
}

interface DoubtGroup {
  sprint_id: string
  sprint_title: string
  mentee_name: string | null
  mentee_email: string
  messages: DoubtMessage[]
}

const KIND_TAG: Record<string, { label: string; icon: typeof HelpCircle; tone: string }> = {
  doubt: {
    label: "Dúvida",
    icon: HelpCircle,
    tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  impediment: {
    label: "Impedimento",
    icon: AlertTriangle,
    tone: "text-red-600 dark:text-red-400 bg-red-500/10",
  },
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
  basePath: string
  refreshKey?: number
  onCount?: (count: number) => void
}

/** Inbox do mentor: dúvidas e impedimentos não lidos, agrupados por sprint. */
export function DoubtsInbox({ basePath, refreshKey, onCount }: Props) {
  const [groups, setGroups] = useState<DoubtGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState("")
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sprints/doubts")
      const json = await res.json()
      if (res.ok) {
        const data: DoubtGroup[] = json.data || []
        setGroups(data)
        onCount?.(
          data.reduce((sum, group) => sum + group.messages.length, 0),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [onCount])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function openReply(sprintId: string) {
    setReplyingTo(sprintId)
    setReplyBody("")
    setAdjustment(null)
    setAdjustmentOpen(false)
  }

  async function handleSendReply(sprintId: string) {
    const trimmed = replyBody.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const payload: Record<string, unknown> = { body: trimmed, kind: "daily" }
      if (adjustment && adjustment.delta !== 0 && adjustment.reason.trim().length >= 3) {
        payload.adjustment = adjustment
      }
      const res = await fetch(`/api/admin/sprints/${sprintId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error || "Erro ao enviar resposta")
        return
      }
      await fetch(`/api/admin/sprints/${sprintId}/mensagens?mark_read=1`)

      toast.success(
        adjustment
          ? `Resposta enviada · ${adjustment.delta > 0 ? "+" : ""}${adjustment.delta} pts`
          : "Resposta enviada",
      )
      setReplyingTo(null)
      setReplyBody("")
      setAdjustment(null)
      setGroups((prev) => prev.filter((g) => g.sprint_id !== sprintId))
      const removed = groups.find((g) => g.sprint_id === sprintId)
      if (removed) {
        onCount?.(
          groups
            .filter((g) => g.sprint_id !== sprintId)
            .reduce((sum, g) => sum + g.messages.length, 0),
        )
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando dúvidas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-2 text-base text-muted-foreground">
          Caixa zerada — nenhuma mensagem aguardando resposta.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const isReplying = replyingTo === group.sprint_id
        return (
          <Card key={group.sprint_id} className="transition-colors hover:border-primary/40">
            <CardContent className="flex flex-col gap-2 py-4 px-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Link
                    href={`${basePath}/${group.sprint_id}?tab=daily`}
                    className="text-base font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {group.mentee_name || group.mentee_email}
                  </Link>
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {group.messages.length}{" "}
                    {group.messages.length === 1 ? "mensagem" : "mensagens"}
                  </span>
                </div>
                <Link
                  href={`${basePath}/${group.sprint_id}?tab=daily`}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Ver na Daily"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{group.sprint_title}</p>
              <div className="flex flex-col gap-1.5">
                {group.messages.slice(0, 3).map((message) => {
                  const tag = KIND_TAG[message.kind]
                  const Icon = tag?.icon
                  return (
                    <div
                      key={message.id}
                      className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      {tag && Icon && (
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tag.tone}`}
                        >
                          <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                          {tag.label}
                        </span>
                      )}
                      <p className="text-sm text-foreground line-clamp-2">
                        <span className="text-xs text-muted-foreground mr-1.5">
                          Dia {message.sprint_day}:
                        </span>
                        {message.body}
                      </p>
                    </div>
                  )
                })}
                {group.messages.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {group.messages.length - 3} mensagens…
                  </p>
                )}
              </div>

              {!isReplying ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 self-start min-h-[40px]"
                  onClick={() => openReply(group.sprint_id)}
                >
                  Responder
                </Button>
              ) : (
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                  <Textarea
                    rows={3}
                    maxLength={4000}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Sua resposta…"
                    autoFocus
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={adjustment ? "default" : "outline"}
                          size="sm"
                          className="h-9"
                        >
                          {adjustment
                            ? `${adjustment.delta > 0 ? "+" : ""}${adjustment.delta} pts`
                            : "Ajustar pontuação"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 flex flex-col gap-3">
                        <p className="text-sm font-semibold">Ajuste de pontuação</p>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="inbox-adj-delta" className="text-xs font-medium text-muted-foreground">
                            Pontos (-50 a +50)
                          </label>
                          <Input
                            id="inbox-adj-delta"
                            type="number"
                            min={-50}
                            max={50}
                            value={adjustment?.delta ?? ""}
                            onChange={(e) =>
                              setAdjustment((cur) => ({
                                delta: Number(e.target.value) || 0,
                                reason: cur?.reason ?? "",
                                category: cur?.category ?? "general",
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="inbox-adj-reason" className="text-xs font-medium text-muted-foreground">
                            Motivo (obrigatório)
                          </label>
                          <Input
                            id="inbox-adj-reason"
                            value={adjustment?.reason ?? ""}
                            placeholder="Ex.: Boa separação de responsabilidades"
                            onChange={(e) =>
                              setAdjustment((cur) => ({
                                delta: cur?.delta ?? 0,
                                reason: e.target.value,
                                category: cur?.category ?? "general",
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
                              setAdjustment((cur) => ({
                                delta: cur?.delta ?? 0,
                                reason: cur?.reason ?? "",
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
                            Anexar à resposta
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-9"
                      disabled={sending || !replyBody.trim()}
                      onClick={() => handleSendReply(group.sprint_id)}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Send className="h-4 w-4 mr-1.5" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
