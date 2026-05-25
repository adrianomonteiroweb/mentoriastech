"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react"
import { formatWhatsAppNumber } from "@/lib/whatsapp"
import type { BookingWithRelations, BookingStatus, MentoringTopic } from "@/lib/types/database"
import { CompleteBookingDialog } from "@/components/dashboard/admin/complete-booking-dialog"

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  payment_pending: "Aguardando Pgto",
  paid: "Pago",
  scheduled: "Agendado",
  completed: "Concluido",
  cancelled: "Cancelado",
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  payment_pending: "bg-orange-500/10 text-orange-500",
  paid: "bg-green-500/10 text-green-500",
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-green-600/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-500",
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "long" })

function parseIsoDate(date: string | null | undefined) {
  if (!date) return null
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—"
  return date.split("-").reverse().join("/")
}

function formatWeekday(date: string | null | undefined) {
  const localDate = parseIsoDate(date)
  if (!localDate) return null
  return WEEKDAY_FORMATTER.format(localDate).replace("-feira", "")
}

export function BookingsTable() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null)
  const [completingBooking, setCompletingBooking] = useState<BookingWithRelations | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    topic_id: "",
    session_date: "",
    start_time: "",
    notes: "",
    guest_name: "",
    guest_email: "",
    guest_whatsapp: "",
    google_meet_url: "",
  })

  function loadBookings() {
    setLoading(true)
    const params = filter !== "all" ? `?status=${filter}` : ""
    fetch(`/api/admin/bookings${params}`)
      .then((r) => r.json())
      .then((json) => setBookings(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBookings()
  }, [filter])

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((json) => setTopics(json.topics || []))
      .catch(console.error)
  }, [])

  async function updateStatus(id: string, status: BookingStatus) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || "Erro ao atualizar agendamento")
    }
    loadBookings()
  }

  function openEdit(booking: BookingWithRelations) {
    setEditingBooking(booking)
    setError("")
    setForm({
      topic_id: booking.topic_id || "",
      session_date: booking.session_date || "",
      start_time: booking.start_time?.substring(0, 5) || "",
      notes: booking.notes || "",
      guest_name: booking.guest_name || booking.profiles?.full_name || "",
      guest_email: booking.guest_email || booking.profiles?.email || "",
      guest_whatsapp: booking.guest_whatsapp || "",
      google_meet_url: booking.google_meet_url || "",
    })
  }

  async function saveBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBooking) return

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/bookings/${editingBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar agendamento")
      }

      setEditingBooking(null)
      loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function deleteBooking(id: string) {
    if (!confirm("Excluir este agendamento?")) return
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || "Erro ao excluir agendamento")
    }
    loadBookings()
  }

  const getName = (b: BookingWithRelations) =>
    b.profiles?.full_name || b.guest_name || "—"
  const getEmail = (b: BookingWithRelations) =>
    b.profiles?.email || b.guest_email || "—"
  const getTopic = (b: BookingWithRelations) =>
    b.mentoring_topics?.name || "—"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="payment_pending">Aguardando Pgto</SelectItem>
            <SelectItem value="scheduled">Agendados</SelectItem>
            <SelectItem value="completed">Concluidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const date = b.session_date || b.created_at.split("T")[0]
                const weekday = formatWeekday(date)

                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{getName(b)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{getEmail(b)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(() => {
                        const whatsapp = b.profiles?.whatsapp || b.guest_whatsapp
                        if (!whatsapp) return <span className="text-xs text-muted-foreground">-</span>
                        const number = formatWhatsAppNumber(whatsapp)
                        return (
                          <a
                            href={`https://wa.me/${number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[140px] items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
                          >
                            <MessageCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{whatsapp}</span>
                          </a>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-xs">{getTopic(b)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {b.booking_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        {weekday && (
                          <span className="font-medium text-foreground">
                            {weekday}
                          </span>
                        )}
                        <span>{formatDate(date)}</span>
                        {b.start_time && (
                          <span className="text-[10px] text-muted-foreground">
                            {b.start_time.substring(0, 5)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {b.status === "pending" && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatus(b.id, "confirmed")}>
                            Confirmar
                          </Button>
                        )}
                        {b.status === "confirmed" && b.booking_type === "paid" && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatus(b.id, "payment_pending")}>
                            Solicitar Pgto
                          </Button>
                        )}
                        {(b.status === "paid" || (b.status === "confirmed" && b.booking_type === "free")) && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatus(b.id, "scheduled")}>
                            Agendar
                          </Button>
                        )}
                        {b.status === "scheduled" && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => setCompletingBooking(b)}>
                            Concluir
                          </Button>
                        )}
                        {b.google_meet_url && (
                          <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
                            <a href={b.google_meet_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Meet
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          onClick={() => openEdit(b)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        {b.status === "cancelled" && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatus(b.id, "scheduled")}>
                            Reativar
                          </Button>
                        )}
                        {!["completed", "cancelled"].includes(b.status) && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                            onClick={() => updateStatus(b.id, "cancelled")}>
                            Cancelar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                          onClick={() => deleteBooking(b.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CompleteBookingDialog
        booking={completingBooking}
        open={!!completingBooking}
        onClose={() => setCompletingBooking(null)}
        onCompleted={() => {
          setCompletingBooking(null)
          loadBookings()
        }}
      />

      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveBooking} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-name">Nome</Label>
                <Input
                  id="booking-name"
                  value={form.guest_name}
                  onChange={(e) => setForm((current) => ({ ...current, guest_name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-email">Email</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={form.guest_email}
                  onChange={(e) => setForm((current) => ({ ...current, guest_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-date">Data</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm((current) => ({ ...current, session_date: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-time">Horario</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((current) => ({ ...current, start_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Tema</Label>
                <Select
                  value={form.topic_id || "none"}
                  onValueChange={(value) => setForm((current) => ({ ...current, topic_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem tema</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-whatsapp">WhatsApp</Label>
                <Input
                  id="booking-whatsapp"
                  value={form.guest_whatsapp}
                  onChange={(e) => setForm((current) => ({ ...current, guest_whatsapp: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-meet">Google Meet</Label>
              <Input
                id="booking-meet"
                type="url"
                value={form.google_meet_url}
                onChange={(e) => setForm((current) => ({ ...current, google_meet_url: e.target.value }))}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-notes">Observacoes</Label>
              <Textarea
                id="booking-notes"
                value={form.notes}
                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar agendamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
