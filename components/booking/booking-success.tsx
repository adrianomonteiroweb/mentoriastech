"use client"

import { CheckCircle2, BookOpen, Briefcase } from "lucide-react"
import Link from "next/link"

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

      <div className="w-full flex flex-col gap-2 mt-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Enquanto isso, explore
        </p>
        <Link
          href="/content"
          className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <BookOpen className="h-4 w-4 text-primary" />
          <div className="flex flex-col text-left">
            <span className="font-medium text-foreground">Conteúdos</span>
            <span className="text-xs text-muted-foreground">Artigos, vídeos e PDFs sobre programação</span>
          </div>
        </Link>
        <Link
          href="/jobs"
          className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <Briefcase className="h-4 w-4 text-primary" />
          <div className="flex flex-col text-left">
            <span className="font-medium text-foreground">Vagas</span>
            <span className="text-xs text-muted-foreground">Oportunidades compartilhadas pela comunidade</span>
          </div>
        </Link>
      </div>

      <button
        onClick={onReset}
        className="mt-1 text-sm font-medium text-primary hover:underline"
      >
        Solicitar nova mentoria
      </button>
    </div>
  )
}
