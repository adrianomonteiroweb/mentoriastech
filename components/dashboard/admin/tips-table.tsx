"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react"
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
import { TipForm } from "@/components/dashboard/admin/tip-form"
import type { Tip, TipPlacement } from "@/lib/types/database"

interface TipsTableProps {
  refreshKey?: number
}

const PLACEMENT_LABELS: Record<TipPlacement, string> = {
  both: "Conteúdo e vagas",
  content: "Conteúdo",
  jobs: "Vagas",
}

export function TipsTable({ refreshKey = 0 }: TipsTableProps) {
  const [items, setItems] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTip, setEditingTip] = useState<Tip | null>(null)

  function loadTips() {
    setLoading(true)
    fetch("/api/admin/tips")
      .then((response) => response.json())
      .then((json) => setItems(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTips()
  }, [refreshKey])

  async function toggleActive(id: string, currentState: boolean) {
    await fetch(`/api/admin/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentState }),
    })
    loadTips()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover esta dica?")) return
    await fetch(`/api/admin/tips/${id}`, { method: "DELETE" })
    loadTips()
  }

  function handleEditSuccess() {
    setEditingTip(null)
    loadTips()
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dica</TableHead>
            <TableHead>Tela</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 5 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Nenhuma dica cadastrada
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="min-w-[280px]">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {PLACEMENT_LABELS[item.placement]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.sort_order}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {item.is_fixed && (
                      <Badge className="bg-primary/10 text-primary">Fixa</Badge>
                    )}
                    {item.is_active ? (
                      <Badge className="bg-green-500/10 text-green-600">Ativa</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inativa
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTip(item)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(item.id, item.is_active)}
                      disabled={item.is_fixed}
                    >
                      {item.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {item.is_fixed ? "Fixa" : item.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.id)}
                      disabled={item.is_fixed}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingTip} onOpenChange={(open) => !open && setEditingTip(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dica</DialogTitle>
          </DialogHeader>
          {editingTip && (
            <TipForm
              key={editingTip.id}
              tip={editingTip}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
