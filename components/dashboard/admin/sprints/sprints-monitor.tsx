"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  Code2,
  Loader2,
  MessageCircleQuestion,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { QuickMessageDialog } from "./quick-message-dialog"
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

type StatusFilter = "all" | "active" | "completed" | "cancelled"

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
]

interface Props {
  basePath: string
  refreshKey?: number
}

export function SprintsMonitor({ basePath, refreshKey }: Props) {
  const [rows, setRows] = useState<SimSprintMonitorRowApi[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [msgTarget, setMsgTarget] = useState<{
    sprintId: string
    menteeName: string
  } | null>(null)

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
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-base text-muted-foreground">
          Nenhuma sprint ainda. Aprove uma candidatura na aba{" "}
          <strong>Candidaturas</strong> para começar.
        </p>
      </div>
    )
  }

  const filtered = statusFilter === "all"
    ? rows
    : rows.filter((r) => r.status === statusFilter)

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 tabular-nums text-[10px] opacity-70">
                {rows.filter((r) => opt.value === "all" || r.status === opt.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma sprint {STATUS_LABELS[statusFilter] ?? statusFilter} encontrada.
        </p>
      ) : (
      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentorado</TableHead>
              <TableHead>Sprint</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead className="min-w-[140px]">Progresso</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Não lidas</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const done = row.done_count ?? 0
              const total = row.task_count ?? 0
              const menteeName = row.mentee?.full_name || row.mentee?.email || "Mentorado"
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`${basePath}/${row.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {menteeName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.title}
                    {row.company?.name ? (
                      <>
                        {" · "}
                        <Link
                          href="/admin/sprints/empresa"
                          className="hover:text-primary hover:underline"
                        >
                          {row.company.name}
                        </Link>
                      </>
                    ) : ""}
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
                    {(row.doubt_count ?? 0) > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
                        title={`${row.doubt_count} dúvida(s)/impedimento(s)${(row.unread_count ?? 0) > (row.doubt_count ?? 0) ? ` · ${(row.unread_count ?? 0) - (row.doubt_count ?? 0)} daily(s)` : ""}`}
                      >
                        <MessageCircleQuestion className="h-3 w-3" aria-hidden="true" />
                        {row.doubt_count}
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="Ações da sprint"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`${basePath}/${row.id}?tab=daily`}>
                            <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                            Abrir Daily
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`${basePath}/${row.id}?tab=ide`}>
                            <Code2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            Abrir IDE
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`${basePath}/${row.id}?tab=pontuacao`}>
                            <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />
                            Ver Pontuação
                          </Link>
                        </DropdownMenuItem>
                        {row.status === "active" && (
                          <DropdownMenuItem
                            onSelect={() =>
                              setMsgTarget({
                                sprintId: row.id,
                                menteeName,
                              })
                            }
                          >
                            <MessageCircleQuestion className="h-4 w-4 mr-2" aria-hidden="true" />
                            Enviar mensagem
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      )}

      {msgTarget && (
        <QuickMessageDialog
          sprintId={msgTarget.sprintId}
          menteeName={msgTarget.menteeName}
          open
          onOpenChange={(open) => {
            if (!open) setMsgTarget(null)
          }}
          onSent={load}
        />
      )}
    </>
  )
}
