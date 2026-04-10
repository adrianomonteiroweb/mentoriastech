"use client"

import type { UnifiedBookingState } from "@/lib/types/booking"
import { Badge } from "@/components/ui/badge"
import { PixQrCode } from "@/components/pix-qrcode"
import { Pencil, CalendarDays, User, BookOpen, Clock, MessageSquare } from "lucide-react"
import { StepNavigation } from "../step-navigation"

interface ReviewStepProps {
  state: UnifiedBookingState
  onGoToStep: (step: number) => void
  onSubmit: () => void
  onNext?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  free: "Mentoria Gratuita",
  paid: "Mentoria Paga",
  private: "Mentoria Particular",
}

function formatDateBR(dateStr: string) {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <Pencil className="h-3 w-3" />
      Alterar
    </button>
  )
}

export function ReviewStep({ state, onGoToStep, onSubmit, onNext }: ReviewStepProps) {
  const isFree = state.mentoringType === "free"
  const date = state.sessionDate
  const time = state.startTime

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Confira os dados antes de enviar:
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Tipo */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tipo</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isFree ? "default" : "secondary"} className="text-xs">
              {TYPE_LABELS[state.mentoringType]}
            </Badge>
            <EditButton onClick={() => onGoToStep(0)} />
          </div>
        </div>

        {/* Tema */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tema</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{state.topicName}</span>
            <EditButton onClick={() => onGoToStep(1)} />
          </div>
        </div>

        {/* Data */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Data</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {state.dayName ? `${state.dayName}, ${formatDateBR(date)}` : formatDateBR(date)}
            </span>
            <EditButton onClick={() => onGoToStep(2)} />
          </div>
        </div>

        {/* Horário */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Horário</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{time}</span>
            <EditButton onClick={() => onGoToStep(2)} />
          </div>
        </div>

        {/* Contato */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Contato</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{state.name}</span>
            <EditButton onClick={() => onGoToStep(3)} />
          </div>
        </div>

        {/* Notes (if any) */}
        {state.notes && (
          <div className="border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Observações: </span>
            <span className="text-xs text-foreground">{state.notes}</span>
          </div>
        )}
      </div>

      {/* PIX donation suggestion for free bookings */}
      {isFree && (
        <div className="animate-in fade-in duration-300">
          <PixQrCode
            pixKey="03440795381"
            merchantName="Adriano Monteiro"
            merchantCity="Fortaleza"
          />
        </div>
      )}

      {/* Paid: info about next step */}
      {!isFree && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Ao prosseguir, você será direcionado para o pagamento de{" "}
            <span className="font-bold text-foreground">R$ 50,00</span> via PIX.
            Sua mentoria só será confirmada após o pagamento.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.errorMsg}</p>
      )}

      <StepNavigation
        onBack={() => onGoToStep(3)}
        onNext={isFree ? onSubmit : (onNext || onSubmit)}
        canGoNext={true}
        isFirst={false}
        isLast={isFree}
        loading={state.status === "loading"}
        submitLabel="Solicitar mentoria"
        nextLabel={!isFree ? "Ir para pagamento" : undefined}
      />
    </div>
  )
}
