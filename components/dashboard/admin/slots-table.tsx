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
import { Plus, Trash2, Ban, CheckCircle2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MentoringSlot } from "@/lib/types/database"
import { buildRRule, describeRRule } from "@/lib/rrule-utils"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

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
    await fetch(`/api/admin/slots/${id}`, { method: "DELETE" })
    loadSlots()
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
                    <Button size="sm" variant="ghost" onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
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
