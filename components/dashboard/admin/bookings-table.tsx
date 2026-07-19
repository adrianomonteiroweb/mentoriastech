"use client"

import Link from "next/link"
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
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { Check, ClipboardCheck, Copy, ExternalLink, Loader2, MessageCircle, MessageSquareText, Pencil, Trash2, Users } from "lucide-react"
import { formatWhatsAppNumber } from "@/lib/whatsapp"
import type { BookingWithRelations, BookingStatus, MentoringTopic, OriginCategory } from "@/lib/types/database"
import { CompleteBookingDialog } from "@/components/dashboard/admin/complete-booking-dialog"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

interface BookingsTableProps {
  bookingId?: string
}

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
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  payment_pending: "bg-orange-500/10 text-orange-500",
  paid: "bg-green-500/10 text-green-500",
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-green-600/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-500",
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
const REQUESTED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const ORIGIN_LABELS: Record<OriginCategory, string> = {
  linkedin: "LinkedIn",
  palestra: "Palestra",
  indicacao: "Indicação",
  instagram: "Instagram",
  evento: "Evento",
}

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

function formatRequestedAt(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return REQUESTED_AT_FORMATTER.format(date)
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return ""
  return fullName.trim().split(/\s+/)[0]
}

function formatTimeForMessage(time: string | null | undefined): string {
  if (!time) return ""
  const [h, m] = time.substring(0, 5).split(":")
  if (!h) return ""
  const hour = parseInt(h, 10)
  const minute = m && m !== "00" ? `:${m}` : ""
  return `${hour}${minute}`
}

function buildConfirmationMessage(
  booking: BookingWithRelations,
  getName: (b: BookingWithRelations) => string,
  getTopic: (b: BookingWithRelations) => string,
): string {
  const fullName = getName(booking)
  const firstName = getFirstName(fullName)
  const topic = getTopic(booking)
  const date = booking.session_date || booking.created_at?.split("T")[0]
  const localDate = parseIsoDate(date)
  const weekday = localDate
    ? WEEKDAY_FORMATTER.format(localDate).replace("-feira", "")
    : ""
  const day = localDate ? localDate.getDate() : ""
  const time = formatTimeForMessage(booking.start_time)

  let msg = `Olá ${firstName}, tudo bem? 😊 Sou o Adriano Monteiro da MentoriasTech e estou passando apenas para confirmar sua mentoria ${weekday} (${day}) às ${time} horas com o tema ${topic}. ✅`

  if (topic.toLowerCase().includes("busca de oportunidade")) {
    msg += "\n\n📄 Assim que possível, envie seu currículo e link do LinkedIn."
  }

  return msg
}

export function BookingsTable({ bookingId }: BookingsTableProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const { mentorId: filterMentorId, buildUrl } = useMentorFilter()
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null)
  const [completingBooking, setCompletingBooking] = useState<BookingWithRelations | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null)
  const [copiedConfirmationId, setCopiedConfirmationId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
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
    setLoadError("")
    const params = new URLSearchParams()
    if (bookingId) {
      params.set("booking_id", bookingId)
    } else if (filter !== "all") {
      params.set("status", filter)
    }

    const query = params.toString()

    fetch(buildUrl(`/api/admin/bookings${query ? `?${query}` : ""}`))
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) {
          throw new Error(json.error || "Erro ao carregar agendamentos")
        }
        return json
      })
      .then((json) => setBookings(json.data || []))
      .catch((err) => {
        console.error(err)
        setBookings([])
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar agendamentos")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBookings()
  }, [filter, bookingId, filterMentorId])

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((json) => setTopics(json.topics || []))
      .catch(console.error)
  }, [])

  async function updateStatus(id: string, status: BookingStatus) {
    setSelectedBooking(null)
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || "Erro ao atualizar agendamento")
    } else if (data.calendar_warning) {
      alert(
        "Agendamento atualizado, mas o evento não foi criado no Google Calendar. Conecte sua conta em Configurações.",
      )
    }
    loadBookings()
  }

  function openEdit(booking: BookingWithRelations) {
    setSelectedBooking(null)
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

  function openCompleteBooking(booking: BookingWithRelations) {
    setSelectedBooking(null)
    setCompletingBooking(booking)
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

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar agendamento")
      }

      setEditingBooking(null)
      loadBookings()
      if (data.calendar_warning) {
        alert(
          "Agendamento salvo, mas o evento não foi criado no Google Calendar. Conecte sua conta em Configurações.",
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function deleteBooking(id: string) {
    if (!confirm("Excluir este agendamento?")) return
    setSelectedBooking(null)
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || "Erro ao excluir agendamento")
    }
    loadBookings()
  }

  async function copyEmail(email: string, bookingId: string) {
    if (!email) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = email
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }

      setCopiedBookingId(bookingId)
      window.setTimeout(() => setCopiedBookingId((current) => (current === bookingId ? null : current)), 1500)
    } catch {
      alert("Nao foi possivel copiar o email.")
    }
  }

  async function copyConfirmation(booking: BookingWithRelations) {
    const msg = buildConfirmationMessage(booking, getName, getTopic)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(msg)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = msg
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopiedConfirmationId(booking.id)
      window.setTimeout(() => setCopiedConfirmationId((current) => (current === booking.id ? null : current)), 1500)
    } catch {
      alert("Não foi possível copiar a mensagem.")
    }
  }

  const getName = (b: BookingWithRelations) =>
    b.profiles?.full_name || b.guest_name || "—"
  const getEmail = (b: BookingWithRelations) =>
    b.profiles?.email || b.guest_email || ""
  const getTopic = (b: BookingWithRelations) =>
    b.paid_mentorships?.title || b.mentoring_topics?.name || "—"
  const getOrigin = (b: BookingWithRelations) => {
    if (!b.origin_category) return "—"
    const label = ORIGIN_LABELS[b.origin_category] || b.origin_category
    return b.origin_description ? `${label} (${b.origin_description})` : label
  }
  const isSingleBookingFilter = !!bookingId

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={filter} onValueChange={setFilter} disabled={isSingleBookingFilter}>
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

        {isSingleBookingFilter && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <span>Mostrando apenas o agendamento selecionado na agenda.</span>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link href="/admin/bookings">Ver todos</Link>
            </Button>
          </div>
        )}
      </div>

      {!loading && !isSingleBookingFilter && (
        <p className="text-xs text-muted-foreground">
          Exibindo {bookings.length} resultado{bookings.length !== 1 ? "s" : ""}
        </p>
      )}

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-md border p-4">
              <Skeleton className="mb-3 h-4 w-2/3" />
              <Skeleton className="mb-4 h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento encontrado
          </div>
        ) : (
          bookings.map((b) => {
            const date = b.session_date || b.created_at.split("T")[0]
            const weekday = formatWeekday(date)
            const email = getEmail(b)

            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBooking(b)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setSelectedBooking(b)
                  }
                }}
                className="rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Abrir ações do agendamento de ${getName(b)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {getName(b)}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {email || "Email não informado"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[b.status]}`}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  <span>{getTopic(b)}</span>
                  <span>
                    {weekday ? `${weekday}, ` : ""}
                    {formatDate(date)}
                    {b.start_time ? ` às ${b.start_time.substring(0, 5)}` : ""}
                  </span>
                  {b.origin_category && (
                    <span className="text-[10px]">Origem: {getOrigin(b)}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {b.booking_type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {formatRequestedAt(b.created_at)}
                  </Badge>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden xl:table-cell">WhatsApp</TableHead>
              <TableHead className="hidden lg:table-cell">Tema</TableHead>
              <TableHead className="hidden xl:table-cell">Tipo</TableHead>
              <TableHead className="hidden 2xl:table-cell">Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden xl:table-cell">Solicitado em</TableHead>
              <TableHead className="hidden lg:table-cell">Data/Hora</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const date = b.session_date || b.created_at.split("T")[0]
                const weekday = formatWeekday(date)

                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{getName(b)}</span>
                        {b.origin_category && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary 2xl:hidden">
                            {ORIGIN_LABELS[b.origin_category] || b.origin_category}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {(() => {
                        const email = getEmail(b)
                        if (!email) {
                          return <span className="text-muted-foreground">-</span>
                        }

                        const copied = copiedBookingId === b.id

                        return (
                          <button
                            type="button"
                            onClick={() => copyEmail(email, b.id)}
                            title={copied ? "Email copiado" : "Copiar email"}
                            aria-label={copied ? `Email ${email} copiado` : `Copiar email ${email}`}
                            className="inline-flex max-w-[220px] items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-left text-[10px] font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate">{email}</span>
                          </button>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
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
                    <TableCell className="hidden lg:table-cell text-xs">{getTopic(b)}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {b.booking_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-xs">{getOrigin(b)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs">
                      <span className="whitespace-nowrap">{formatRequestedAt(b.created_at)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
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
                      <div className="flex flex-wrap gap-1">
                        {b.status === "pending" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" title="Confirmar"
                            onClick={() => updateStatus(b.id, "confirmed")}>
                            <Check className="h-3 w-3 xl:mr-1" />
                            <span className="hidden xl:inline">Confirmar</span>
                          </Button>
                        )}
                        {b.status === "confirmed" && b.booking_type === "paid" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" title="Solicitar Pgto"
                            onClick={() => updateStatus(b.id, "payment_pending")}>
                            <span className="hidden xl:inline">Solicitar Pgto</span>
                            <span className="xl:hidden">Pgto</span>
                          </Button>
                        )}
                        {(b.status === "paid" || (b.status === "confirmed" && b.booking_type === "free")) && (
                          <Button size="sm" variant="outline" className="text-xs h-7" title="Agendar"
                            onClick={() => updateStatus(b.id, "scheduled")}>
                            <span className="hidden xl:inline">Agendar</span>
                            <span className="xl:hidden">Ag.</span>
                          </Button>
                        )}
                        {b.status === "scheduled" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" title="Concluir"
                            onClick={() => openCompleteBooking(b)}>
                            <span className="hidden xl:inline">Concluir</span>
                            <span className="xl:hidden">OK</span>
                          </Button>
                        )}
                        {b.google_meet_url && (
                          <Button size="sm" variant="ghost" className="text-xs h-7" title="Meet" asChild>
                            <a href={b.google_meet_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 xl:mr-1" />
                              <span className="hidden xl:inline">Meet</span>
                            </a>
                          </Button>
                        )}
                        {b.mentee_id && (
                          <Button size="sm" variant="ghost" className="text-xs h-7" title="Ir para mentorado" asChild>
                            <Link href={`/admin/mentees?search=${encodeURIComponent(getEmail(b))}`}>
                              <Users className="h-3 w-3 xl:mr-1" />
                              <span className="hidden xl:inline">Mentorado</span>
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7" title="Copiar confirmação"
                          onClick={() => copyConfirmation(b)}>
                          {copiedConfirmationId === b.id ? (
                            <ClipboardCheck className="h-3 w-3 xl:mr-1 text-green-500" />
                          ) : (
                            <MessageSquareText className="h-3 w-3 xl:mr-1" />
                          )}
                          <span className="hidden xl:inline">{copiedConfirmationId === b.id ? "Copiado!" : "Confirmação"}</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7" title="Editar"
                          onClick={() => openEdit(b)}>
                          <Pencil className="h-3 w-3 xl:mr-1" />
                          <span className="hidden xl:inline">Editar</span>
                        </Button>
                        {b.status === "cancelled" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" title="Reativar"
                            onClick={() => updateStatus(b.id, "scheduled")}>
                            <span className="hidden xl:inline">Reativar</span>
                            <span className="xl:hidden">Reat.</span>
                          </Button>
                        )}
                        {!["completed", "cancelled"].includes(b.status) && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" title="Cancelar"
                            onClick={() => updateStatus(b.id, "cancelled")}>
                            <span className="hidden xl:inline">Cancelar</span>
                            <span className="xl:hidden">Canc.</span>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" title="Excluir"
                          onClick={() => deleteBooking(b.id)}>
                          <Trash2 className="h-3 w-3 xl:mr-1" />
                          <span className="hidden xl:inline">Excluir</span>
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

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedBooking ? getName(selectedBooking) : "Agendamento"}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (() => {
            const date = selectedBooking.session_date || selectedBooking.created_at.split("T")[0]
            const weekday = formatWeekday(date)
            const email = getEmail(selectedBooking)
            const whatsapp = selectedBooking.profiles?.whatsapp || selectedBooking.guest_whatsapp
            const whatsappNumber = whatsapp ? formatWhatsAppNumber(whatsapp) : ""
            const copied = copiedBookingId === selectedBooking.id

            return (
              <div className="grid gap-4">
                <div className="grid gap-3 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedBooking.status]}`}>
                      {STATUS_LABELS[selectedBooking.status]}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedBooking.booking_type}
                    </Badge>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Tema</span>
                    <p>{getTopic(selectedBooking)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border p-2">
                      <span className="text-xs text-muted-foreground">Data</span>
                      <p className="text-sm font-medium">
                        {weekday ? `${weekday}, ` : ""}
                        {formatDate(date)}
                      </p>
                    </div>
                    <div className="rounded-md border p-2">
                      <span className="text-xs text-muted-foreground">Horário</span>
                      <p className="text-sm font-medium">
                        {selectedBooking.start_time ? selectedBooking.start_time.substring(0, 5) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Solicitado em</span>
                    <p>{formatRequestedAt(selectedBooking.created_at)}</p>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Origem</span>
                    <p>{getOrigin(selectedBooking)}</p>
                  </div>
                  <div className="grid gap-2">
                    {email && (
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => copyEmail(email, selectedBooking.id)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Email copiado" : email}
                      </Button>
                    )}
                    {whatsapp && (
                      <Button variant="outline" className="justify-start" asChild>
                        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" />
                          {whatsapp}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  {selectedBooking.status === "pending" && (
                    <Button variant="outline" className="justify-start" onClick={() => updateStatus(selectedBooking.id, "confirmed")}>
                      <Check className="h-4 w-4" />
                      Confirmar
                    </Button>
                  )}
                  {selectedBooking.status === "confirmed" && selectedBooking.booking_type === "paid" && (
                    <Button variant="outline" className="justify-start" onClick={() => updateStatus(selectedBooking.id, "payment_pending")}>
                      Solicitar pagamento
                    </Button>
                  )}
                  {(selectedBooking.status === "paid" || (selectedBooking.status === "confirmed" && selectedBooking.booking_type === "free")) && (
                    <Button variant="outline" className="justify-start" onClick={() => updateStatus(selectedBooking.id, "scheduled")}>
                      Agendar
                    </Button>
                  )}
                  {selectedBooking.status === "scheduled" && (
                    <Button variant="outline" className="justify-start" onClick={() => openCompleteBooking(selectedBooking)}>
                      Concluir
                    </Button>
                  )}
                  {selectedBooking.google_meet_url && (
                    <Button variant="ghost" className="justify-start" asChild>
                      <a href={selectedBooking.google_meet_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Meet
                      </a>
                    </Button>
                  )}
                  {selectedBooking.mentee_id && (
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href={`/admin/mentees?search=${encodeURIComponent(getEmail(selectedBooking))}`}>
                        <Users className="h-4 w-4" />
                        Ir para mentorado
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" className="justify-start" onClick={() => copyConfirmation(selectedBooking)}>
                    {copiedConfirmationId === selectedBooking.id ? (
                      <ClipboardCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <MessageSquareText className="h-4 w-4" />
                    )}
                    {copiedConfirmationId === selectedBooking.id ? "Confirmação copiada!" : "Copiar confirmação"}
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => openEdit(selectedBooking)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  {selectedBooking.status === "cancelled" && (
                    <Button variant="outline" className="justify-start" onClick={() => updateStatus(selectedBooking.id, "scheduled")}>
                      Reativar
                    </Button>
                  )}
                  {!["completed", "cancelled"].includes(selectedBooking.status) && (
                    <Button variant="ghost" className="justify-start text-destructive" onClick={() => updateStatus(selectedBooking.id, "cancelled")}>
                      Cancelar
                    </Button>
                  )}
                  <Button variant="ghost" className="justify-start text-destructive" onClick={() => deleteBooking(selectedBooking.id)}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

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
                <PhoneNumberInput
                  id="booking-whatsapp"
                  value={form.guest_whatsapp}
                  onChange={(value) => setForm((current) => ({ ...current, guest_whatsapp: value }))}
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
