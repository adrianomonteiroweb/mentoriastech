"use client"

import { useState } from "react"
import { Building2, CalendarDays, Loader2, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import type { SimSprintTemplateApi } from "@/lib/types/database"

const ARCHETYPE_LABELS: Record<string, string> = {
  startup: "Startup",
  saas: "SaaS",
  enterprise: "Enterprise",
}

interface Props {
  vagas: SimSprintTemplateApi[]
  disabled?: boolean
  onApplied: () => void
}

export function JobPostings({ vagas, disabled, onApplied }: Props) {
  const [selected, setSelected] = useState<SimSprintTemplateApi | null>(null)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleApply() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/minhas-mentorias/sprints/candidaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: selected.id, message }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao enviar candidatura")
        return
      }
      toast.success("Candidatura enviada! Aguarde a aprovação do mentor.")
      setSelected(null)
      setMessage("")
      onApplied()
    } finally {
      setSubmitting(false)
    }
  }

  if (vagas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-base text-muted-foreground">
            Nenhuma vaga aberta no momento. Volte em breve!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3" role="list" aria-label="Vagas abertas">
        {vagas.map((vaga) => {
          const alreadyApplied = vaga.my_application_status === "pending"
          return (
            <Card key={vaga.id} role="listitem">
              <CardContent className="flex flex-col gap-3 py-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">
                      {vaga.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {vaga.company?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {ARCHETYPE_LABELS[vaga.company?.archetype || "startup"]}
                  </Badge>
                </div>

                {vaga.objective && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {vaga.objective}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {vaga.duration_days} dias · Nível {vaga.level}
                  </p>
                  <Button
                    size="sm"
                    className="min-h-[40px]"
                    disabled={disabled || alreadyApplied}
                    onClick={() => setSelected(vaga)}
                  >
                    {alreadyApplied ? "Candidatura enviada" : "Candidatar-se"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar-se à vaga</DialogTitle>
            <DialogDescription>
              {selected?.title} — {selected?.company?.name}. O mentor analisará
              sua candidatura e, se aprovada, sua sprint começa na hora.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="application-message"
              className="text-sm font-medium text-foreground"
            >
              Mensagem para o mentor (opcional)
            </label>
            <Textarea
              id="application-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Por que você quer participar desta sprint?"
              maxLength={2000}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
