"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TrilhaEnrollmentDialog } from "@/components/dashboard/admin/trilha-enrollment-dialog"
import type {
  TrackEnrollment,
  TrackEnrollmentStatus,
} from "@/lib/types/database"

type Row = TrackEnrollment & {
  track_title: string | null
  mentee_name: string | null
  mentee_email: string | null
}

const FILTERS: { value: TrackEnrollmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "active", label: "Ativas" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
]

const STATUS_LABEL: Record<TrackEnrollmentStatus, string> = {
  pending: "Pendente",
  active: "Ativa",
  completed: "Concluída",
  cancelled: "Cancelada",
}

export function TrilhaEnrollmentsTable() {
  const [filter, setFilter] = useState<TrackEnrollmentStatus | "all">("all")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const query = filter === "all" ? "" : `?status=${filter}`
    fetch(`/api/admin/trilha-enrollments${query}`)
      .then((res) => res.json())
      .then((json) => setRows(json.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma inscrição encontrada.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentorado</TableHead>
                <TableHead>Trilha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {row.mentee_name || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.mentee_email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{row.track_title || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "pending" ? "default" : "secondary"}
                    >
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(row.id)
                        setDialogOpen(true)
                      }}
                    >
                      Gerenciar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TrilhaEnrollmentDialog
        enrollmentId={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onChanged={load}
      />
    </div>
  )
}
