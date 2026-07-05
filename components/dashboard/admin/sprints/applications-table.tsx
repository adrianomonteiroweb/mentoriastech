"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { SimApplicationApi } from "@/lib/types/database"

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
}

interface Props {
  refreshKey?: number
  onChanged?: () => void
}

export function ApplicationsTable({ refreshKey, onChanged }: Props) {
  const [applications, setApplications] = useState<SimApplicationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState<SimApplicationApi | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sprints/applications")
      const json = await res.json()
      if (res.ok) setApplications(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function review(
    application: SimApplicationApi,
    status: "approved" | "rejected",
    note?: string,
  ) {
    setActionId(application.id)
    try {
      const res = await fetch(
        `/api/admin/sprints/applications/${application.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, review_note: note || "" }),
        },
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao analisar candidatura")
        return
      }
      toast.success(
        status === "approved"
          ? "Candidatura aprovada — sprint iniciada!"
          : "Candidatura rejeitada",
      )
      setRejecting(null)
      setRejectNote("")
      await load()
      onChanged?.()
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando candidaturas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">
        Nenhuma candidatura ainda.
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {applications.map((application) => (
          <div
            key={application.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground">
                  {application.mentee?.full_name || application.mentee?.email}
                </p>
                <Badge
                  variant={
                    application.status === "pending"
                      ? "secondary"
                      : application.status === "approved"
                        ? "default"
                        : "outline"
                  }
                >
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {application.template?.title} — {application.company?.name} ·{" "}
                {application.template?.duration_days} dias
              </p>
              {application.message && (
                <p className="mt-1.5 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground italic">
                  “{application.message}”
                </p>
              )}
            </div>

            {application.status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  className="min-h-[40px]"
                  disabled={actionId === application.id}
                  onClick={() => review(application, "approved")}
                >
                  {actionId === application.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  )}
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px] text-destructive hover:text-destructive"
                  disabled={actionId === application.id}
                  onClick={() => setRejecting(application)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Rejeitar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar candidatura</DialogTitle>
            <DialogDescription>
              {rejecting?.mentee?.full_name || rejecting?.mentee?.email} —{" "}
              {rejecting?.template?.title}. Explique o motivo para orientar o
              mentorado (opcional, mas recomendado).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Ex.: Recomendo começar por uma vaga de nível 1 para pegar o ritmo."
            rows={3}
            maxLength={2000}
            aria-label="Motivo da rejeição"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionId === rejecting?.id}
              onClick={() => rejecting && review(rejecting, "rejected", rejectNote)}
            >
              Rejeitar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
