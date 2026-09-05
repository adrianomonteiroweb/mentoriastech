"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Ban, CheckCircle2, CalendarX, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MentoringSlot } from "@/lib/types/database"
import { buildRRule, describeRRule } from "@/lib/rrule-utils"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type SlotException = {
  id: string
  slot_id: string
  blocked_date: string
  reason: string | null
  created_at: string
}

function nextOccurrence(dayOfWeek: number): string {
  const today = new Date()
  const todayDow = today.getDay()
  let daysUntil = dayOfWeek - todayDow
  if (daysUntil <= 0) daysUntil += 7
  const next = new Date(today)
  next.setDate(today.getDate() + daysUntil)
  return next.toISOString().split("T")[0]
}

function BlockDateDialog({ slot, onSaved }: { slot: MentoringSlot; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [exceptions, setExceptions] = useState<SlotException[]>([])
  const [loadingExceptions, setLoadingExceptions] = useState(false)
  const [blockedDate, setBlockedDate] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingDate, setDeletingDate] = useState<string | null>(null)

  function defaultDate() {
    if (slot.day_of_week !== null && slot.day_of_week !== undefined) {
      return nextOccurrence(slot.day_of_week)
    }
    const today = new Date()
    today.setDate(today.getDate() + 1)
    return today.toISOString().split("T")[0]
  }

  function loadExceptions() {
    setLoadingExceptions(true)
    fetch(`/api/admin/slots/${slot.id}/exceptions`)
      .then((r) => r.json())
      .then((json) => setExceptions(json.data || []))
      .catch(console.error)
      .finally(() => setLoadingExceptions(false))
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setBlockedDate(defaultDate())
      setReason("")
      loadExceptions()
    }
  }

  async function handleSubmit() {
    if (!blockedDate) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_date: blockedDate, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao bloquear data")
        return
      }
      setBlockedDate(defaultDate())
      setReason("")
      loadExceptions()
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(date: string) {
    setDeletingDate(date)
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}/exceptions/${date}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao remover bloqueio")
        return
      }
      loadExceptions()
      onSaved()
    } finally {
      setDeletingDate(null)
    }
  }

  const slotLabel = slot.rrule
    ? describeRRule(slot.rrule)
    : slot.day_of_week !== null && slot.day_of_week !== undefined
      ? DAY_NAMES[slot.day_of_week]
      : "—"

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Bloquear data específica">
          <CalendarX className="h-3.5 w-3.5 text-orange-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear data — {slotLabel} {slot.start_time.substring(0, 5)}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Data a bloquear</Label>
            <Input
              type="date"
              value={blockedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setBlockedDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Motivo (opcional)</Label>
            <Input
              type="text"
              placeholder="ex: viagem, feriado..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !blockedDate}>
            {submitting ? "Salvando..." : "Bloquear esta data"}
          </Button>

          {/* Lista de datas bloqueadas */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Datas bloqueadas</p>
            {loadingExceptions ? (
              <Skeleton className="h-8 w-full" />
            ) : exceptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma data bloqueada.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">
                        {new Date(ex.blocked_date + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      {ex.reason && (
                        <span className="text-[10px] text-muted-foreground">{ex.reason}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingDate === ex.blocked_date}
                      onClick={() => handleDelete(ex.blocked_date)}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SlotsTable() {
  const [slots, setSlots] = useState<MentoringSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { mentorId, buildUrl } = useMentorFilter()

  // Form state
  const [slotType, setSlotType] = useState<"free" | "paid" | "private">("free")
  const [time, setTime] = useState("09:00")
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function loadSlots() {
    setLoading(true)
    fetch(buildUrl("/api/admin/slots"))
      .then((r) => r.json())
      .then((json) => setSlots(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSlots() }, [mentorId])

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  async function toggleActive(id: string, isActive: boolean) {
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/admin/slots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      })
      loadSlots()
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function deleteSlot(id: string) {
    if (!confirm("Remover este horário?")) return
    try {
      const res = await fetch(`/api/admin/slots/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao remover horário")
        return
      }
      loadSlots()
    } catch {
      alert("Erro ao remover horário")
    }
  }

  function resetForm() {
    setSlotType("free")
    setTime("09:00")
    setDayOfWeek("1")
    setSelectedDays([])
    setStartDate("")
    setEndDate("")
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let body: Record<string, unknown>

      if (slotType === "free") {
        body = {
          day_of_week: parseInt(dayOfWeek),
          start_time: time,
          slot_type: "free",
        }
      } else {
        if (selectedDays.length === 0 || !startDate) return
        body = {
          rrule: buildRRule(selectedDays),
          start_time: time,
          slot_type: slotType,
          recurrence_start: startDate,
          recurrence_end: endDate || undefined,
        }
      }

      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      loadSlots()
      setDialogOpen(false)
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const isPaid = slotType === "paid" || slotType === "private"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Horários de Mentoria</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo horário de mentoria</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              {/* Tipo */}
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Select value={slotType} onValueChange={(v) => setSlotType(v as "free" | "paid" | "private")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="private">Particular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Horário */}
              <div className="flex flex-col gap-1.5">
                <Label>Horário</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>

              {/* Gratuito: dia da semana */}
              {!isPaid && (
                <div className="flex flex-col gap-1.5">
                  <Label>Dia da semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((name, i) => (
                        <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pago: dias da semana (checkboxes) */}
              {isPaid && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Dias da semana</Label>
                    <div className="flex flex-wrap gap-3">
                      {DAY_ABBR.map((abbr, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`day-${i}`}
                            checked={selectedDays.includes(i)}
                            onCheckedChange={() => toggleDay(i)}
                          />
                          <Label htmlFor={`day-${i}`} className="text-xs cursor-pointer">
                            {abbr}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label>Data início</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Data fim (opcional)</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  {selectedDays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Recorrência: {describeRRule(buildRRule(selectedDays))}
                    </p>
                  )}
                </>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || (isPaid && (selectedDays.length === 0 || !startDate))}
              >
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Exibindo {slots.length} resultado{slots.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia / Recorrência</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              slots.map((slot) => (
                <TableRow key={slot.id} className={!slot.is_active ? "opacity-60" : undefined}>
                  <TableCell>
                    {slot.rrule
                      ? describeRRule(slot.rrule)
                      : slot.day_of_week !== null
                        ? DAY_NAMES[slot.day_of_week]
                        : "—"
                    }
                  </TableCell>
                  <TableCell>{slot.start_time.substring(0, 5)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{slot.slot_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={slot.is_active}
                              disabled={togglingIds.has(slot.id)}
                              onCheckedChange={() => toggleActive(slot.id, slot.is_active)}
                            />
                            {slot.is_active ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                                <Ban className="h-3.5 w-3.5" /> Bloqueado
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {slot.is_active
                            ? "Clique para bloquear — não aparecerá na agenda dos mentorados"
                            : "Clique para desbloquear — voltará a aparecer na agenda"
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <BlockDateDialog slot={slot} onSaved={loadSlots} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Bloquear data específica (ex: próximo sábado)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button size="sm" variant="ghost" onClick={() => deleteSlot(slot.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
