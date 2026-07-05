"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, MessageCircleQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SimSprintMonitorRowApi } from "@/lib/types/database"

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  completed: "Concluída",
  cancelled: "Cancelada",
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

interface Props {
  basePath: string
  refreshKey?: number
}

export function SprintsMonitor({ basePath, refreshKey }: Props) {
  const [rows, setRows] = useState<SimSprintMonitorRowApi[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sprints")
      const json = await res.json()
      if (res.ok) setRows(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando sprints">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">
        Nenhuma sprint ainda. Aprove uma candidatura para começar.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mentorado</TableHead>
            <TableHead>Sprint</TableHead>
            <TableHead>Dia</TableHead>
            <TableHead className="min-w-[140px]">Progresso</TableHead>
            <TableHead>Pontos</TableHead>
            <TableHead>Dúvidas</TableHead>
            <TableHead>Última atividade</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const done = row.done_count ?? 0
            const total = row.task_count ?? 0
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.mentee?.full_name || row.mentee?.email}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.title}
                  {row.company?.name ? ` · ${row.company.name}` : ""}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {row.current_day}/{row.duration_days}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={total > 0 ? (done / total) * 100 : 0}
                      className="h-2 w-20"
                      aria-label={`${done} de ${total} tasks concluídas`}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {done}/{total}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.total_score ?? 0}
                </TableCell>
                <TableCell>
                  {(row.unread_count ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      <MessageCircleQuestion className="h-3 w-3" aria-hidden="true" />
                      {row.unread_count}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatRelative(row.last_activity_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={row.status === "active" ? "default" : "outline"}>
                    {STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
