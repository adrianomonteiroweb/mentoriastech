"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Loader2, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TrilhaForm } from "@/components/dashboard/admin/trilha-form"
import type { LearningTrack } from "@/lib/types/database"

export function TrilhaTable({ refreshKey }: { refreshKey: number }) {
  const [tracks, setTracks] = useState<LearningTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<LearningTrack | null>(null)
  const [localRefresh, setLocalRefresh] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/trilhas")
      .then((res) => res.json())
      .then((json) => setTracks(json.data || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey, localRefresh])

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta trilha? As inscrições associadas serão desvinculadas."))
      return
    await fetch(`/api/admin/trilhas/${id}`, { method: "DELETE" })
    setLocalRefresh((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma trilha cadastrada.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks.map((track) => (
              <TableRow key={track.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{track.title}</span>
                    {track.supports_english && (
                      <Globe className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={track.is_active ? "default" : "secondary"}>
                    {track.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(track)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(track.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar trilha</DialogTitle>
          </DialogHeader>
          {editing && (
            <TrilhaForm
              track={editing}
              onSuccess={() => {
                setEditing(null)
                setLocalRefresh((k) => k + 1)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
