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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookingWithRelations, BookingStatus } from "@/lib/types/database"

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

export function BookingsTable() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

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

  async function updateStatus(id: string, status: BookingStatus) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
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
              <TableHead>Tema</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{getName(b)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{getEmail(b)}</TableCell>
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
                    {b.session_date
                      ? b.session_date.split("-").reverse().join("/")
                      : b.created_at.split("T")[0].split("-").reverse().join("/")}
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
                          onClick={() => updateStatus(b.id, "completed")}>
                          Concluir
                        </Button>
                      )}
                      {!["completed", "cancelled"].includes(b.status) && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                          onClick={() => updateStatus(b.id, "cancelled")}>
                          Cancelar
                        </Button>
                      )}
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
