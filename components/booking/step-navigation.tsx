"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react"

interface StepNavigationProps {
  onBack: () => void
  onNext: () => void
  canGoNext: boolean
  isFirst: boolean
  isLast: boolean
  loading?: boolean
  submitLabel?: string
  nextLabel?: string
}

export function StepNavigation({
  onBack,
  onNext,
  canGoNext,
  isFirst,
  isLast,
  loading = false,
  submitLabel = "Confirmar",
  nextLabel,
}: StepNavigationProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {!isFirst && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={loading}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Button>
      )}

      <div className="flex-1" />

      <Button
        type="button"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext || loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isLast ? (
          <Send className="h-3.5 w-3.5" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
        {loading ? "Enviando..." : isLast ? submitLabel : (nextLabel || "Próximo")}
      </Button>
    </div>
  )
}
