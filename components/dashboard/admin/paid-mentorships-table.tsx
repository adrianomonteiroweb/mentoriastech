"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaidMentorshipForm } from "@/components/dashboard/admin/paid-mentorship-form"
import { Trash2, Eye, EyeOff, Pencil } from "lucide-react"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"
import type { PaidMentorship } from "@/lib/types/database"

interface PaidMentorshipsTableProps {
  refreshKey?: number
}

function formatAmount(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format((cents ?? 0) / 100)
  } catch {
    return `${((cents ?? 0) / 100).toFixed(2)} ${currency}`
  }
}

export function PaidMentorshipsTable({ refreshKey = 0 }: PaidMentorshipsTableProps) {
  const [items, setItems] = useState<PaidMentorship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<PaidMentorship | null>(null)
  const { mentorId, buildUrl } = useMentorFilter()

  function loadMentorships() {
    setLoading(true)
    setError(null)
    fetch(buildUrl("/api/admin/paid-mentorships"))
      .then(async (r) => {
        const json = await r.json().catch(() => null)
        if (!r.ok) throw new Error(json?.error || "Erro ao carregar mentorias pagas")
        return json
      })
      .then((json) => setItems(json.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMentorships() }, [refreshKey, mentorId])

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/paid-mentorships/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    })
    loadMentorships()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover esta mentoria paga?")) return
    await fetch(`/api/admin/paid-mentorships/${id}`, { method: "DELETE" })
    loadMentorships()
  }

  function handleEditSuccess() {
    setEditing(null)
    loadMentorships()
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground">
          Exibindo {items.length} resultado{items.length !== 1 ? "s" : ""}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden sm:table-cell">Mentor</TableHead>
              <TableHead className="hidden md:table-cell">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma mentoria paga cadastrada
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[220px] truncate font-medium">{item.title}</TableCell>
                  <TableCell className="text-sm">{formatAmount(item.amount_cents, item.currency)}</TableCell>
                  <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                    {item.mentor_email || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{item.sort_order}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {item.is_active ? (
                        <><Eye className="h-3 w-3 text-green-500" /> <span className="text-green-500">Ativa</span></>
                      ) : (
                        <><EyeOff className="h-3 w-3 text-muted-foreground" /> <span className="text-muted-foreground">Inativa</span></>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar mentoria paga</DialogTitle>
            </DialogHeader>
            {editing && (
              <PaidMentorshipForm
                key={editing.id}
                mentorship={editing}
                onSuccess={handleEditSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
