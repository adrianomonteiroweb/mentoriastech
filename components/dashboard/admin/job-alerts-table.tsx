"use client"

import { useEffect, useState } from "react"
import { BellOff, BellRing, Globe, Pencil, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JobAlertForm } from "@/components/dashboard/admin/job-alert-form"
import { JobAlertCreateForm } from "@/components/dashboard/admin/job-alert-create-form"
import { LEVEL_OPTIONS, type AdminJobAlert } from "@/lib/db/job-alerts"
import { formatWhatsAppNumber } from "@/lib/whatsapp"

interface JobAlertsTableProps {
  refreshKey?: number
}

const LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  LEVEL_OPTIONS.map((o) => [o.value, o.label]),
)

export function JobAlertsTable({ refreshKey = 0 }: JobAlertsTableProps) {
  const [items, setItems] = useState<AdminJobAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminJobAlert | null>(null)
  const [creating, setCreating] = useState(false)

  function load() {
    setLoading(true)
    fetch("/api/admin/job-alerts")
      .then((r) => r.json())
      .then((json) => setItems(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  async function toggleEnabled(item: AdminJobAlert) {
    setBusyId(item.id)
    await fetch(`/api/admin/job-alerts/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    }).catch(console.error)
    setBusyId(null)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover a inscrição deste mentorado? Ele deixará de receber vagas.")) return
    setBusyId(id)
    await fetch(`/api/admin/job-alerts/${id}`, { method: "DELETE" }).catch(console.error)
    setBusyId(null)
    load()
  }

  function handleEditSuccess() {
    setEditing(null)
    load()
  }

  function handleCreateSuccess() {
    setCreating(false)
    load()
  }

  const activeCount = items.filter((i) => i.enabled).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {items.length} inscrito{items.length !== 1 ? "s" : ""} · {activeCount} ativo
            {activeCount !== 1 ? "s" : ""}
          </p>
        )}
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Inscrever mentorado
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentorado</TableHead>
              <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
              <TableHead className="hidden lg:table-cell">Filtros</TableHead>
              <TableHead className="hidden sm:table-cell">Limite/dia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum mentorado inscrito para receber vagas
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="min-w-[160px]">
                    <p className="text-sm font-medium text-foreground">
                      {item.name || item.full_name || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.email}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.whatsapp ? (
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(item.whatsapp)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {item.whatsapp}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex max-w-[280px] flex-wrap gap-1">
                      {item.levels.map((lvl) => (
                        <Badge key={lvl} variant="outline" className="text-xs">
                          {LEVEL_LABELS[lvl] ?? lvl}
                        </Badge>
                      ))}
                      {item.positions.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.positions.length} cargo{item.positions.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {item.stack.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.stack.length} stack
                        </Badge>
                      )}
                      {item.is_international && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Globe className="h-3 w-3" /> Intl
                        </Badge>
                      )}
                      {item.levels.length === 0 &&
                        item.positions.length === 0 &&
                        item.stack.length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem filtros</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {item.daily_limit}
                  </TableCell>
                  <TableCell>
                    {item.enabled ? (
                      <Badge className="bg-green-500/10 text-green-600">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pausado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Editar"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title={item.enabled ? "Pausar" : "Ativar"}
                        disabled={busyId === item.id}
                        onClick={() => toggleEnabled(item)}
                      >
                        {item.enabled ? (
                          <BellOff className="h-4 w-4 sm:mr-1" />
                        ) : (
                          <BellRing className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {item.enabled ? "Pausar" : "Ativar"}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Remover"
                        disabled={busyId === item.id}
                        onClick={() => deleteItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Remover</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar inscrição</DialogTitle>
          </DialogHeader>
          {editing && (
            <JobAlertForm
              key={editing.id}
              subscription={editing}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inscrever mentorado</DialogTitle>
          </DialogHeader>
          {creating && (
            <JobAlertCreateForm onSuccess={handleCreateSuccess} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
