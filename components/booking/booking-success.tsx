"use client"

import { CheckCircle2 } from "lucide-react"

interface BookingSuccessProps {
  onReset: () => void
}

export function BookingSuccess({ onReset }: BookingSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-card p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Solicitação enviada!
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Obrigado pelo interesse na mentoria! Entrarei em contato via WhatsApp
        em breve para confirmar o agendamento.
      </p>
      <button
        onClick={onReset}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        Solicitar nova mentoria
      </button>
    </div>
  )
}
