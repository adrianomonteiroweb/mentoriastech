"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { Profile, SelectionProcess } from "@/lib/types/database"

interface AddMenteeToSelectionProcessDialogProps {
  mentee: Profile | null
  open: boolean
  onClose: () => void
}

export function AddMenteeToSelectionProcessDialog({
  mentee,
  open,
  onClose,
}: AddMenteeToSelectionProcessDialogProps) {
  const [processes, setProcesses] = useState<SelectionProcess[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!open) {
      setSelectedId("")
      setError("")
      setSuccess("")
      return
    }

    setLoading(true)
    fetch("/api/admin/selection-processes")
      .then((r) => r.json())
      .then((json) => setProcesses(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  async function handleSubmit() {
    if (!mentee || !selectedId) return
    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`/api/admin/selection-processes/${selectedId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentee_ids: [mentee.id] }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao adicionar ao processo seletivo")
      }

      if (Array.isArray(data?.data) && data.data.length === 0) {
        setSuccess("Este mentorado já está neste processo seletivo.")
      } else {
        setSuccess("Mentorado adicionado ao processo seletivo.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar ao processo seletivo")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar a processo seletivo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {mentee?.full_name || mentee?.email} sera adicionado como candidato no processo selecionado.
          </p>

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : processes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum processo seletivo cadastrado ainda.
            </p>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo seletivo" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    <span className="flex items-center gap-2">
                      {process.company} — {process.position}
                      {process.status === "closed" && (
                        <Badge variant="outline" className="text-[10px]">Encerrado</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {success && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> {success}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedId}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
