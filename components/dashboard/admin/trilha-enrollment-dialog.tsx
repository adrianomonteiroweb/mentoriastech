"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarCheck, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  TrackEnrollmentWithDetails,
  TrackPhaseStatus,
} from "@/lib/types/database"

const STATUS_LABEL: Record<TrackPhaseStatus, string> = {
  locked: "Bloqueada",
  pending: "A agendar",
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluída",
  skipped: "Pulada",
}

interface Props {
  enrollmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export function TrilhaEnrollmentDialog({
  enrollmentId,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const [detail, setDetail] = useState<TrackEnrollmentWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [scheduleInputs, setScheduleInputs] = useState<
    Record<string, { date: string; time: string }>
  >({})

  const load = useCallback(() => {
    if (!enrollmentId) return
    setLoading(true)
    fetch(`/api/admin/trilha-enrollments/${enrollmentId}`)
      .then((res) => res.json())
      .then((json) => setDetail(json.data || null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [enrollmentId])

  useEffect(() => {
    if (open) {
      setError("")
      load()
    } else {
      setDetail(null)
    }
  }, [open, load])

  async function runAction(payload: Record<string, unknown>) {
    if (!enrollmentId) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/trilha-enrollments/${enrollmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "Erro ao executar ação.")
        return
      }
      setDetail(data.data || null)
      onChanged()
    } catch {
      setError("Erro ao executar ação.")
    } finally {
      setBusy(false)
    }
  }

  function setSchedule(phaseId: string, field: "date" | "time", value: string) {
    setScheduleInputs((prev) => ({
      ...prev,
      [phaseId]: { date: "", time: "", ...prev[phaseId], [field]: value },
    }))
  }

  function schedulePhase(phaseId: string) {
    const input = scheduleInputs[phaseId]
    if (!input?.date || !input?.time) {
      setError("Informe data e horário para agendar a fase.")
      return
    }
    runAction({
      action: "schedule_phase",
      phase_id: phaseId,
      session_date: input.date,
      start_time: input.time,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrição na trilha</DialogTitle>
          <DialogDescription>
            {detail?.track?.title || ""}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{detail.guest_name}</span>
              <span className="text-muted-foreground">{detail.guest_email}</span>
              <Badge variant="secondary">{detail.status}</Badge>
              {detail.include_english && (
                <Badge variant="secondary">Inglês A1</Badge>
              )}
            </div>

            {detail.status === "pending" && (
              <div className="rounded-md border border-border p-3">
                <p className="text-sm text-muted-foreground">
                  Slot escolhido para a Fase 1:{" "}
                  <strong className="text-foreground">
                    {detail.requested_session_date || "—"}{" "}
                    {detail.requested_start_time?.slice(0, 5) || ""}
                  </strong>
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => runAction({ action: "confirm" })}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="h-4 w-4" />
                  )}
                  Confirmar e agendar Fase 1
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {detail.phases
                .filter((p) => p.status !== "skipped")
                .map((phase, index) => (
                  <div
                    key={phase.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {index + 1}. {phase.title}
                      </span>
                      <Badge variant="secondary">
                        {STATUS_LABEL[phase.status]}
                      </Badge>
                    </div>

                    {phase.booking?.session_date && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {phase.booking.session_date}{" "}
                        {phase.booking.start_time?.slice(0, 5)}
                      </p>
                    )}

                    {(phase.status === "pending" ||
                      phase.status === "locked") && (
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <input
                          type="date"
                          value={scheduleInputs[phase.id]?.date || ""}
                          onChange={(e) =>
                            setSchedule(phase.id, "date", e.target.value)
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                        <input
                          type="time"
                          value={scheduleInputs[phase.id]?.time || ""}
                          onChange={(e) =>
                            setSchedule(phase.id, "time", e.target.value)
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => schedulePhase(phase.id)}
                        >
                          Agendar
                        </Button>
                      </div>
                    )}

                    {(phase.status === "scheduled" ||
                      phase.status === "in_progress") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={busy}
                        onClick={() =>
                          runAction({
                            action: "complete_phase",
                            phase_id: phase.id,
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Concluir fase
                      </Button>
                    )}
                  </div>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {detail.status !== "cancelled" &&
              detail.status !== "completed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit text-destructive"
                  disabled={busy}
                  onClick={() => runAction({ action: "cancel" })}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar inscrição
                </Button>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
