"use client"

import { useEffect, useState } from "react"
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
import { Loader2, Pencil, Plus, X } from "lucide-react"
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
    setCreating(false)
    setEditingId(b.id)
    setError("")
    setForm({
      topic_id: b.topic_id || "",
      session_date: b.session_date || "",
      start_time: b.start_time?.substring(0, 5) || "",
      topics_discussed: b.topics_discussed || "",
      mentee_strengths: b.mentee_strengths || "",
      mentee_growth_areas: b.mentee_growth_areas || "",
      admin_notes: b.admin_notes || "",
    })
  }

  function startCreate() {
    setEditingId(null)
    setCreating(true)
    setError("")
    setForm({
      ...emptyForm,
      session_date: new Date().toISOString().split("T")[0],
    })
  }

  function cancelForm() {
    setEditingId(null)
    setCreating(false)
    setError("")
  }

  function updateForm(field: keyof SessionForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

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
          body: JSON.stringify({ ...form, mentee_id: mentee.id }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Erro ao criar sessao")
        }
      } else if (editingId) {
        const res = await fetch(`/api/admin/bookings/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Erro ao salvar sessao")
        }
      }

      cancelForm()
      loadBookings()
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
                    {b.admin_notes && <SectionView label="Anotacoes privadas" text={b.admin_notes} />}
                    {!b.topics_discussed && !b.mentee_strengths && !b.mentee_growth_areas && !b.admin_notes && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma anotacao registrada.</p>
                    )}
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
  isNew,
  onUpdate,
  onSave,
  onCancel,
}: {
  form: SessionForm
  topics: MentoringTopic[]
  saving: boolean
  error: string
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
        <Label className="text-[10px]">Anotacoes privadas</Label>
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
