"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2 } from "lucide-react"
import type { MentoringSlot } from "@/lib/types/database"

const DAY_NAMES = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]

export function SlotsTable() {
  const [slots, setSlots] = useState<MentoringSlot[]>([])
  const [loading, setLoading] = useState(true)

  function loadSlots() {
    setLoading(true)
    fetch("/api/admin/slots")
      .then((r) => r.json())
      .then((json) => setSlots(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSlots() }, [])

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/slots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    })
    loadSlots()
  }

  async function deleteSlot(id: string) {
    if (!confirm("Remover este horario?")) return
    await fetch(`/api/admin/slots/${id}`, { method: "DELETE" })
    loadSlots()
  }

  async function addSlot() {
    const day = prompt("Dia da semana (0=Dom, 1=Seg, ..., 6=Sab):")
    const time = prompt("Horario (ex: 20:00):")
    const type = prompt("Tipo (free/paid/private):") || "free"
    if (!day || !time) return

    await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_of_week: parseInt(day),
        start_time: time,
        slot_type: type,
      }),
    })
    loadSlots()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Horarios de Mentoria</h3>
        <Button size="sm" onClick={addSlot}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acoes</TableHead>
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
                <TableRow key={slot.id}>
                  <TableCell>{DAY_NAMES[slot.day_of_week]}</TableCell>
                  <TableCell>{slot.start_time.substring(0, 5)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{slot.slot_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(slot.id, slot.is_active)}
                      className={`text-xs font-medium ${slot.is_active ? "text-green-500" : "text-muted-foreground"}`}
                    >
                      {slot.is_active ? "Ativo" : "Inativo"}
                    </button>
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
