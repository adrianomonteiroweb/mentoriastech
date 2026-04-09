"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, Clock, BookOpen } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
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

export function BookingHistory() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    supabase
      .from("bookings")
      .select("*, mentoring_topics(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookings((data as BookingWithRelations[]) || [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Voce ainda nao tem nenhum agendamento.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <Card key={b.id}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">
                  {b.mentoring_topics?.name || "Mentoria"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {b.session_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {b.session_date.split("-").reverse().join("/")}
                  </span>
                )}
                {b.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {b.start_time.substring(0, 5)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className="text-xs capitalize">{b.booking_type}</Badge>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[b.status]}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
