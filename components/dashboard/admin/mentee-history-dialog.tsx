"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Cloud, CloudOff, Loader2, Paperclip, Pencil, Plus, WifiOff, X } from "lucide-react"
import { BookingAttachments } from "@/components/dashboard/admin/booking-attachments"
import {
  countQueuedBookingHistoryChanges,
  flushBookingHistoryQueue,
  getQueuedBookingHistoryDraft,
  queueBookingHistoryChange,
  type BookingHistorySyncPayload,
} from "@/lib/offline/booking-history-sync"
import type { BookingWithRelations, MentoringTopic, Profile } from "@/lib/types/database"

interface SessionForm {
  topic_id: string
  session_date: string
  start_time: string
  topics_discussed: string
  mentee_strengths: string
  mentee_growth_areas: string
  admin_notes: string
}

const emptyForm: SessionForm = {
  topic_id: "",
  session_date: "",
  start_time: "",
  topics_discussed: "",
  mentee_strengths: "",
  mentee_growth_areas: "",
  admin_notes: "",
}

const AUTOSAVE_DELAY_MS = 2500

type AutosaveStatus = "idle" | "pending" | "saving" | "queued" | "synced" | "error"

interface AutosaveState {
  status: AutosaveStatus
  message: string
}

const idleAutosave: AutosaveState = { status: "idle", message: "" }

function buildSessionForm(booking: BookingWithRelations): SessionForm {
  return {
    topic_id: booking.topic_id || "",
    session_date: booking.session_date || "",
    start_time: booking.start_time?.substring(0, 5) || "",
    topics_discussed: booking.topics_discussed || "",
    mentee_strengths: booking.mentee_strengths || "",
    mentee_growth_areas: booking.mentee_growth_areas || "",
    admin_notes: booking.admin_notes || "",
  }
}

function toHistoryPayload(form: SessionForm): BookingHistorySyncPayload {
  return {
    topic_id: form.topic_id,
    session_date: form.session_date,
    start_time: form.start_time,
    topics_discussed: form.topics_discussed,
    mentee_strengths: form.mentee_strengths,
    mentee_growth_areas: form.mentee_growth_areas,
    admin_notes: form.admin_notes,
  }
}

function serializeHistoryPayload(payload: BookingHistorySyncPayload) {
  return JSON.stringify(payload)
}

function normalizeDisplayTime(value: string) {
  if (!value) return null
  return value.length === 5 ? `${value}:00` : value
}

interface MenteeHistoryDialogProps {
  mentee: Profile | null
  open: boolean
  onClose: () => void
}

export function MenteeHistoryDialog({ mentee, open, onClose }: MenteeHistoryDialogProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<SessionForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [autosave, setAutosave] = useState<AutosaveState>(idleAutosave)
  const autosaveBaselineRef = useRef("")
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadBookings() {
    if (!mentee) return
    setLoading(true)
    fetch(`/api/admin/bookings?mentee_id=${mentee.id}&status=completed&pageSize=50`)
      .then((r) => r.json())
      .then((json) => setBookings(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!mentee || !open) return
    loadBookings()
    fetch("/api/topics")
      .then((r) => r.json())
      .then((json) => setTopics(json.topics || []))
      .catch(console.error)
  }, [mentee, open])

  function startEdit(b: BookingWithRelations) {
    const draft = getQueuedBookingHistoryDraft(b.id)
    const nextForm = draft?.payload || buildSessionForm(b)

    setCreating(false)
    setEditingId(b.id)
    setError("")
    setForm(nextForm)
    autosaveBaselineRef.current = serializeHistoryPayload(toHistoryPayload(nextForm))
    setAutosave(
      draft
        ? {
            status: "queued",
            message: "Rascunho local recuperado. Ele sera sincronizado quando houver conexao.",
          }
        : idleAutosave,
    )
  }

  function startCreate() {
    setEditingId(null)
    setCreating(true)
    setError("")
    setAutosave(idleAutosave)
    setForm({
      ...emptyForm,
      session_date: new Date().toISOString().split("T")[0],
    })
  }

  function cancelForm() {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }

    setEditingId(null)
    setCreating(false)
    setError("")
    setAutosave(idleAutosave)
  }

  function updateForm(field: keyof SessionForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function applyHistoryPayload(bookingId: string, payload: BookingHistorySyncPayload) {
    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) return booking

        return {
          ...booking,
          topic_id: payload.topic_id || null,
          session_date: payload.session_date || null,
          start_time: normalizeDisplayTime(payload.start_time),
          topics_discussed: payload.topics_discussed || null,
          mentee_strengths: payload.mentee_strengths || null,
          mentee_growth_areas: payload.mentee_growth_areas || null,
          admin_notes: payload.admin_notes || null,
          mentoring_topics:
            topics.find((topic) => topic.id === payload.topic_id) || booking.mentoring_topics || null,
        }
      }),
    )
  }

  async function flushQueuedChanges(silent = false) {
    const result = await flushBookingHistoryQueue()

    if (result.syncedCount > 0 && !editingId) {
      loadBookings()
    }

    if (silent) return result

    if (result.error) {
      setAutosave({
        status: "error",
        message: `Alteracoes salvas localmente. Sincronizacao pendente: ${result.error}`,
      })
    } else if (result.pendingCount > 0) {
      setAutosave({
        status: "queued",
        message: `${result.pendingCount} alteracao(oes) aguardando conexao.`,
      })
    } else if (result.syncedCount > 0) {
      setAutosave({
        status: "synced",
        message: "Historico sincronizado com o banco.",
      })
    }

    return result
  }

  async function persistHistoryChange(bookingId: string, payload: BookingHistorySyncPayload) {
    queueBookingHistoryChange(bookingId, payload)
    applyHistoryPayload(bookingId, payload)
    autosaveBaselineRef.current = serializeHistoryPayload(payload)

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAutosave({
        status: "queued",
        message: "Sem conexao. Alteracoes salvas neste dispositivo.",
      })
      return { pendingCount: countQueuedBookingHistoryChanges() }
    }

    setAutosave({ status: "saving", message: "Salvando historico..." })
    return flushQueuedChanges()
  }

  useEffect(() => {
    if (!open) return

    void flushQueuedChanges(true)

    function handleOnline() {
      void flushQueuedChanges()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("focus", handleOnline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("focus", handleOnline)
    }
  }, [open])

  useEffect(() => {
    if (!editingId || creating) return

    const payload = toHistoryPayload(form)
    const serializedPayload = serializeHistoryPayload(payload)

    if (serializedPayload === autosaveBaselineRef.current) return

    setAutosave({
      status: "pending",
      message: "Alteracao detectada. Autosave em alguns segundos...",
    })

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      void persistHistoryChange(editingId, payload)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [creating, editingId, form])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!mentee) return

    setSaving(true)
    setError("")

    try {
      if (creating) {
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, mentee_id: mentee.id, status: "completed" }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Erro ao criar sessao")
        }
      } else if (editingId) {
        const result = await persistHistoryChange(editingId, toHistoryPayload(form))

        if ("error" in result && result.error) {
          throw new Error(result.error)
        }
      }

      cancelForm()
      if (creating) {
        loadBookings()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (!mentee) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historico de mentorias — {mentee.full_name || mentee.email}</DialogTitle>
        </DialogHeader>

        {!creating && !editingId && (
          <Button size="sm" variant="outline" className="w-fit text-xs" onClick={startCreate}>
            <Plus className="h-3 w-3 mr-1" /> Nova sessao
          </Button>
        )}

        {(creating || editingId) && (
          <SessionFormFields
            form={form}
            topics={topics}
            saving={saving}
            error={error}
            autosave={autosave}
            isNew={creating}
            onUpdate={updateForm}
            onSave={handleSave}
            onCancel={cancelForm}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 && !creating ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma mentoria concluida encontrada.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className={`rounded-lg border p-4 ${editingId === b.id ? "border-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {b.session_date
                        ? b.session_date.split("-").reverse().join("/")
                        : new Date(b.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {b.start_time && (
                      <span className="text-xs text-muted-foreground">
                        {b.start_time.substring(0, 5)}
                      </span>
                    )}
                    {b.mentoring_topics?.name && (
                      <Badge variant="outline" className="text-[10px]">
                        {b.mentoring_topics.name}
                      </Badge>
                    )}
                  </div>
                  {editingId !== b.id && !creating && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => startEdit(b)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                </div>

                {editingId !== b.id && (
                  <>
                    {b.topics_discussed && <SectionView label="Duvidas e temas abordados" text={b.topics_discussed} />}
                    {b.mentee_strengths && <SectionView label="Pontos positivos" text={b.mentee_strengths} />}
                    {b.mentee_growth_areas && <SectionView label="Pontos a desenvolver" text={b.mentee_growth_areas} />}
                    {b.admin_notes && <SectionView label="Anotacoes do mentor" text={b.admin_notes} />}
                    {!!b.mentorship_checklist?.length && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Checklist
                        </p>
                        <div className="flex flex-col gap-1">
                          {b.mentorship_checklist.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-xs text-foreground">
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                {item.checked ? "OK" : "Pendente"}
                              </Badge>
                              <span className={item.checked ? "" : "text-muted-foreground"}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!b.topics_discussed && !b.mentee_strengths && !b.mentee_growth_areas && !b.admin_notes && !b.mentorship_checklist?.length && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma anotacao registrada.</p>
                    )}
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        Materiais
                      </p>
                      <BookingAttachments bookingId={b.id} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SessionFormFields({
  form,
  topics,
  saving,
  error,
  autosave,
  isNew,
  onUpdate,
  onSave,
  onCancel,
}: {
  form: SessionForm
  topics: MentoringTopic[]
  saving: boolean
  error: string
  autosave: AutosaveState
  isNew: boolean
  onUpdate: (field: keyof SessionForm, value: string) => void
  onSave: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form onSubmit={onSave} className="rounded-lg border border-primary bg-card p-4 grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          {isNew ? "Nova sessao" : "Editando sessao"}
        </p>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!isNew && <AutosaveIndicator autosave={autosave} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px]">Data</Label>
          <Input
            type="date"
            value={form.session_date}
            onChange={(e) => onUpdate("session_date", e.target.value)}
            required
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px]">Horario</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => onUpdate("start_time", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px]">Tema</Label>
          <Select
            value={form.topic_id || "none"}
            onValueChange={(v) => onUpdate("topic_id", v === "none" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem tema</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Duvidas e temas abordados</Label>
        <Textarea
          value={form.topics_discussed}
          onChange={(e) => onUpdate("topics_discussed", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Pontos positivos</Label>
        <Textarea
          value={form.mentee_strengths}
          onChange={(e) => onUpdate("mentee_strengths", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Pontos a desenvolver</Label>
        <Textarea
          value={form.mentee_growth_areas}
          onChange={(e) => onUpdate("mentee_growth_areas", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">Anotacoes do mentor</Label>
        <Textarea
          value={form.admin_notes}
          onChange={(e) => onUpdate("admin_notes", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="text-xs h-7">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={saving} className="text-xs h-7">
          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {isNew ? "Criar sessao" : "Salvar"}
        </Button>
      </div>
    </form>
  )
}

function AutosaveIndicator({ autosave }: { autosave: AutosaveState }) {
  if (autosave.status === "idle") return null

  const config = {
    pending: {
      Icon: Cloud,
      className: "border-border bg-secondary/60 text-muted-foreground",
    },
    saving: {
      Icon: Loader2,
      className: "border-primary/30 bg-primary/10 text-primary",
    },
    queued: {
      Icon: WifiOff,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    },
    synced: {
      Icon: CheckCircle2,
      className: "border-primary/30 bg-primary/10 text-primary",
    },
    error: {
      Icon: CloudOff,
      className: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  }[autosave.status]

  const Icon = config.Icon

  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${config.className}`}>
      <Icon className={`h-3.5 w-3.5 ${autosave.status === "saving" ? "animate-spin" : ""}`} />
      <span>{autosave.message}</span>
    </div>
  )
}

function SectionView({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-xs text-foreground whitespace-pre-line">{text}</p>
    </div>
  )
}
