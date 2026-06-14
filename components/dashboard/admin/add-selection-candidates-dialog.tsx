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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Search } from "lucide-react"
import type { Profile } from "@/lib/types/database"

interface AddSelectionCandidatesDialogProps {
  open: boolean
  processId: string
  excludeIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export function AddSelectionCandidatesDialog({
  open,
  processId,
  excludeIds,
  onClose,
  onSuccess,
}: AddSelectionCandidatesDialogProps) {
  const [search, setSearch] = useState("")
  const [mentees, setMentees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelectedIds(new Set())
      setError("")
      return
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const params = new URLSearchParams({ pageSize: "20" })
    if (search.trim()) params.set("search", search.trim())

    const timeout = setTimeout(() => {
      fetch(`/api/admin/mentees?${params.toString()}`)
        .then((r) => r.json())
        .then((json) => setMentees(json.data || []))
        .catch(console.error)
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timeout)
  }, [open, search])

  function toggleMentee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/selection-processes/${processId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentee_ids: Array.from(selectedIds) }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao adicionar mentorados")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar mentorados")
    } finally {
      setSubmitting(false)
    }
  }

  const availableMentees = mentees.filter((m) => !excludeIds.includes(m.id))

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar mentorados</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="pl-8"
            />
          </div>

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : availableMentees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum mentorado encontrado
              </p>
            ) : (
              availableMentees.map((mentee) => (
                <Label
                  key={mentee.id}
                  htmlFor={`mentee-${mentee.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm hover:border-border hover:bg-muted/50"
                >
                  <Checkbox
                    id={`mentee-${mentee.id}`}
                    checked={selectedIds.has(mentee.id)}
                    onCheckedChange={() => toggleMentee(mentee.id)}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{mentee.full_name || "Sem nome"}</span>
                    <span className="text-xs text-muted-foreground">{mentee.email}</span>
                  </div>
                </Label>
              ))
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedIds.size === 0}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
