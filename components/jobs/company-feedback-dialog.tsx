"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyFeedbackCategory } from "@/lib/types/database"

const FEEDBACK_OPTIONS: { value: CompanyFeedbackCategory; label: string }[] = [
  { value: "salario_baixo", label: "Salário baixo" },
  { value: "processo_longo", label: "Processo seletivo longo demais" },
  { value: "nao_confiavel", label: "Não confiável" },
  { value: "processos_inexistentes", label: "Processos inexistentes" },
  { value: "outro", label: "Outro" },
]

interface CompanyFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: string
}

export function CompanyFeedbackDialog({
  open,
  onOpenChange,
  company,
}: CompanyFeedbackDialogProps) {
  const [selected, setSelected] = useState<CompanyFeedbackCategory | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setSelected(null)
    setComment("")
    setSuccess(false)
    setError("")
  }

  async function handleSubmit() {
    if (!selected) return

    if (selected === "outro" && !comment.trim()) {
      setError("Descreva o problema no campo de comentário.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/jobs/company-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          category: selected,
          comment: comment.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar feedback")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-orange-400" />
            Feedback sobre {company}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-4 text-center">
            <p className="text-sm text-green-400 font-medium">
              Feedback enviado com sucesso!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              O administrador vai analisar seu relato.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => handleClose(false)}
            >
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Selecione o motivo do feedback:
            </p>

            <div className="flex flex-col gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelected(option.value)
                    setError("")
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    selected === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {(selected === "outro" || (selected && comment)) && (
              <Textarea
                placeholder={selected === "outro" ? "Descreva o problema..." : "Comentário adicional (opcional)"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
              />
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selected || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar feedback
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
