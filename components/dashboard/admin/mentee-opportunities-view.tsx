"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Linkedin,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// ---------- Types (inline, API shapes) ----------

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  seniority: string | null
  career_focus: string | null
}

interface Opportunity {
  id: string
  profile_id: string
  company_name: string
  company_linkedin_url: string | null
  title: string | null
  url: string | null
  description: string | null
  status: string
  priority: string
  work_model: string | null
  job_level: string | null
  contact_name: string | null
  checklist: { id: string; label: string; checked: boolean }[] | null
  application_date: string | null
  next_follow_up_at: string | null
  next_interview_at: string | null
  created_at: string
  updated_at: string
}

interface OpportunityDetail extends Opportunity {
  events: {
    id: string
    event_type: string
    title: string | null
    body: string | null
    from_status: string | null
    to_status: string | null
    author_id: string | null
    author_name: string | null
    occurred_at: string
  }[]
}

// ---------- Constants ----------

const STAGE_LABELS: Record<string, string> = {
  evaluating: "Avaliar",
  preparing_application: "Preparar",
  resume_sent: "Enviado",
  in_conversation: "Conversa",
  interviews: "Entrevista",
  offer: "Proposta",
  finalized: "Finalizada",
}

const STAGE_COLORS: Record<string, string> = {
  evaluating: "text-blue-400 border-blue-500/40",
  preparing_application: "text-amber-400 border-amber-500/40",
  resume_sent: "text-cyan-400 border-cyan-500/40",
  in_conversation: "text-purple-400 border-purple-500/40",
  interviews: "text-orange-400 border-orange-500/40",
  offer: "text-green-400 border-green-500/40",
  finalized: "text-gray-400 border-gray-500/40",
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baixa",
}

const EVENT_LABELS: Record<string, string> = {
  stage_change: "Mudanca de etapa",
  note: "Anotacao",
  mentor_comment: "Comentario do mentor",
  follow_up: "Follow-up",
  interview_scheduled: "Entrevista agendada",
  message_sent: "Mensagem enviada",
  application_sent: "Candidatura enviada",
}

function formatDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function daysSince(d: string | null): string {
  if (!d) return ""
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Hoje"
  if (days === 1) return "ha 1 dia"
  return `ha ${days} dias`
}

// ---------- Mentee Selector ----------

function MenteeSelector({
  onSelect,
}: {
  onSelect: (mentee: Profile) => void
}) {
  const [mentees, setMentees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ pageSize: "200" })
        const res = await fetch(`/api/admin/mentees?${params}`)
        const json = await res.json()
        setMentees(json.data || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = search.trim()
    ? mentees.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : mentees

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Selecione um mentorado para ver suas oportunidades e candidaturas.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar mentorado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Nenhum mentorado encontrado.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => onSelect(m)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                  {(m.full_name || m.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {m.full_name || "Sem nome"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {m.email}
                    {m.seniority && ` · ${m.seniority}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Opportunity Row (admin view) ----------

function OpportunityRow({
  opp,
  onSelect,
  isSelected,
}: {
  opp: Opportunity
  onSelect: () => void
  isSelected: boolean
}) {
  const stageColor = STAGE_COLORS[opp.status] || ""
  const checkedCount = opp.checklist?.filter((i) => i.checked).length || 0
  const totalCount = opp.checklist?.length || 0

  return (
    <Card
      className={`cursor-pointer transition-colors ${isSelected ? "border-primary" : "hover:border-primary/40"}`}
      onClick={onSelect}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {opp.company_name}
            </span>
            <Badge variant="outline" className={`text-[10px] ${stageColor}`}>
              {STAGE_LABELS[opp.status] || opp.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {opp.title || "Vaga"}
            {opp.work_model && ` · ${opp.work_model}`}
            {opp.job_level && ` · ${opp.job_level}`}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
          {totalCount > 0 && (
            <span className="text-[10px]">{checkedCount}/{totalCount}</span>
          )}
          <Badge variant="outline" className="text-[10px]">
            {PRIORITY_LABELS[opp.priority] || opp.priority}
          </Badge>
          <span className="text-[10px] w-12 text-right">
            {daysSince(opp.updated_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Pipeline summary ----------

function PipelineSummary({ opportunities }: { opportunities: Opportunity[] }) {
  const stages = Object.entries(STAGE_LABELS)
  const counts = Object.fromEntries(
    stages.map(([key]) => [key, opportunities.filter((o) => o.status === key).length]),
  )
  const total = opportunities.length
  const active = opportunities.filter((o) => o.status !== "finalized").length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{total}</strong> total</span>
        <span><strong className="text-foreground">{active}</strong> ativas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {stages.map(([key, label]) => {
          const count = counts[key] || 0
          if (count === 0) return null
          const color = STAGE_COLORS[key] || ""
          return (
            <Badge key={key} variant="outline" className={`text-[10px] ${color}`}>
              {label}: {count}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Detail + Comment panel ----------

function OpportunityDetailPanel({
  opportunityId,
  onClose,
}: {
  opportunityId: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<OpportunityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)
  const [showEvents, setShowEvents] = useState(true)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/mentee-opportunities/${opportunityId}`)
      const json = await res.json()
      setDetail(json.data || null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    setLoading(true)
    fetchDetail()
  }, [fetchDetail])

  async function handleComment() {
    if (!comment.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/mentee-opportunities/${opportunityId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment.trim() }),
      })
      if (res.ok) {
        setComment("")
        fetchDetail()
      }
    } catch {
      // silently fail
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return <p className="text-xs text-muted-foreground py-6">Oportunidade nao encontrada.</p>
  }

  const o = detail
  const stageColor = STAGE_COLORS[o.status] || ""
  const checkedCount = o.checklist?.filter((i) => i.checked).length || 0
  const totalCount = o.checklist?.length || 0

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">
              {o.title || "Vaga"} · {o.company_name}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${stageColor}`}>
              {STAGE_LABELS[o.status] || o.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {PRIORITY_LABELS[o.priority] || o.priority}
            </Badge>
            {o.work_model && <span className="text-[10px] text-muted-foreground">{o.work_model}</span>}
            {o.job_level && <span className="text-[10px] text-muted-foreground">· {o.job_level}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {o.company_linkedin_url && (
              <a href={o.company_linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Linkedin className="h-3 w-3" /> Empresa
              </a>
            )}
            {o.url && (
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Vaga
              </a>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs flex-shrink-0">
          Fechar
        </Button>
      </div>

      {/* Info grid */}
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Candidatura</span>
          <span className="text-foreground">{o.application_date ? formatDate(o.application_date) : "Nao enviada"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Checklist</span>
          <span className="text-foreground">{totalCount > 0 ? `${checkedCount}/${totalCount} concluidos` : "Sem checklist"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Contato</span>
          <span className="text-foreground">{o.contact_name || "Nao identificado"}</span>
        </div>
      </div>

      {/* Description */}
      {o.description && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Descricao</span>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{o.description}</p>
        </div>
      )}

      {/* Checklist items */}
      {o.checklist && o.checklist.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Checklist da etapa</span>
          <div className="flex flex-col gap-1">
            {o.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span className={item.checked ? "text-green-400" : "text-muted-foreground"}>
                  {item.checked ? "✓" : "○"}
                </span>
                <span className={item.checked ? "text-muted-foreground line-through" : "text-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment box */}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <Label className="text-xs font-medium">Comentar nesta candidatura</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva um comentario, sugestao ou orientacao para o mentorado..."
          rows={3}
          className="text-xs"
        />
        <Button
          size="sm"
          onClick={handleComment}
          disabled={!comment.trim() || sending}
          className="self-end"
        >
          {sending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Send className="h-3 w-3 mr-1" />
          )}
          Enviar comentario
        </Button>
      </div>

      {/* Timeline */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowEvents((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          {showEvents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Timeline ({o.events?.length || 0} eventos)
        </button>

        {showEvents && o.events && o.events.length > 0 && (
          <div className="flex flex-col gap-2">
            {o.events.map((ev) => {
              const isMentor = ev.event_type === "mentor_comment"
              return (
                <div
                  key={ev.id}
                  className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-xs ${
                    isMentor ? "border border-primary/20 bg-primary/5" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isMentor ? "text-primary" : "text-foreground"}`}>
                      {ev.title || EVENT_LABELS[ev.event_type] || ev.event_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(ev.occurred_at)}
                    </span>
                  </div>
                  {ev.event_type === "stage_change" && ev.from_status && ev.to_status && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {STAGE_LABELS[ev.from_status] || ev.from_status}
                      <ArrowRight className="h-2.5 w-2.5" />
                      {STAGE_LABELS[ev.to_status] || ev.to_status}
                    </span>
                  )}
                  {ev.body && (
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap mt-0.5">{ev.body}</p>
                  )}
                  {isMentor && ev.author_name && (
                    <span className="text-[10px] text-primary">— {ev.author_name}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {showEvents && (!o.events || o.events.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum evento registrado.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------- Mentee Opportunities View ----------

function MenteeOpportunitiesPanel({
  mentee,
  onBack,
}: {
  mentee: Profile
  onBack: () => void
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>("all")

  const fetchOpportunities = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/mentee-opportunities?mentee_id=${mentee.id}`)
      const json = await res.json()
      setOpportunities(json.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [mentee.id])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const filtered = stageFilter === "all"
    ? opportunities
    : opportunities.filter((o) => o.status === stageFilter)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back + mentee info */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs flex-shrink-0">
            ← Voltar
          </Button>
          <div className="flex flex-col gap-0 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {mentee.full_name || "Mentorado"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {mentee.email}
              {mentee.seniority && ` · ${mentee.seniority}`}
              {mentee.career_focus && ` · ${mentee.career_focus}`}
            </span>
          </div>
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline summary */}
      <PipelineSummary opportunities={opportunities} />

      {/* Content */}
      {opportunities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary/30 p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Este mentorado ainda nao tem oportunidades cadastradas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* List */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "oportunidade" : "oportunidades"}
            </span>
            {filtered.map((o) => (
              <OpportunityRow
                key={o.id}
                opp={o}
                onSelect={() => setSelectedId(selectedId === o.id ? null : o.id)}
                isSelected={selectedId === o.id}
              />
            ))}
          </div>

          {/* Detail */}
          {selectedId && (
            <div className="lg:w-[480px] flex-shrink-0">
              <OpportunityDetailPanel
                key={selectedId}
                opportunityId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Root export ----------

export function MenteeOpportunitiesView() {
  const [selectedMentee, setSelectedMentee] = useState<Profile | null>(null)

  if (selectedMentee) {
    return (
      <MenteeOpportunitiesPanel
        mentee={selectedMentee}
        onBack={() => setSelectedMentee(null)}
      />
    )
  }

  return <MenteeSelector onSelect={setSelectedMentee} />
}
