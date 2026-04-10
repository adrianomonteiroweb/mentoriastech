"use client"

import type { ScheduleSlot } from "@/lib/types/booking"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepNavigation } from "../step-navigation"

interface DateTimeStepProps {
  mentoringType: "free" | "paid" | "private"
  // Shared
  slots: ScheduleSlot[]
  slotsLoading: boolean
  selectedSlotId: string
  onSelectSlot: (slotId: string, sessionDate: string, startTime: string, dayName: string) => void
  // Navigation
  onNext: () => void
  onBack: () => void
}

export function DateTimeStep({
  mentoringType,
  slots,
  slotsLoading,
  selectedSlotId,
  onSelectSlot,
  onNext,
  onBack,
}: DateTimeStepProps) {
  const slotTypeFilter = mentoringType === "free" ? "free" : mentoringType

  return <SlotList
    slots={slots}
    slotsLoading={slotsLoading}
    selectedSlotId={selectedSlotId}
    onSelectSlot={onSelectSlot}
    slotTypeFilter={slotTypeFilter}
    emptyMessage={
      mentoringType === "free"
        ? "Todos os horários desta semana já foram preenchidos. Volte na próxima semana!"
        : "Nenhum horário disponível nas próximas semanas. Novos horários serão publicados em breve!"
    }
    onNext={onNext}
    onBack={onBack}
  />
}

// ---------------------------------------------------------------------------
// Unified slot list — works for both free and paid slots
// ---------------------------------------------------------------------------

function SlotList({
  slots,
  slotsLoading,
  selectedSlotId,
  onSelectSlot,
  slotTypeFilter,
  emptyMessage,
  onNext,
  onBack,
}: {
  slots: ScheduleSlot[]
  slotsLoading: boolean
  selectedSlotId: string
  onSelectSlot: (slotId: string, sessionDate: string, startTime: string, dayName: string) => void
  slotTypeFilter: string
  emptyMessage: string
  onNext: () => void
  onBack: () => void
}) {
  const availableSlots = slots.filter((s) => s.isAvailable && s.slotType === slotTypeFilter)
  const availableCount = availableSlots.length

  if (slotsLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando horários...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Escolha um horário disponível:
        </p>
        {availableCount > 0 && availableCount <= 2 && (
          <Badge variant="secondary" className="gap-1 text-amber-500 border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-3 w-3" />
            Últimos horários!
          </Badge>
        )}
        {availableCount > 2 && (
          <span className="text-xs text-muted-foreground">
            {availableCount} horários disponíveis
          </span>
        )}
      </div>

      {availableCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
          {availableSlots.map((slot, index) => {
            const dateFormatted = slot.date.split("-").reverse().slice(0, 2).join("/")
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSelectSlot(slot.id, slot.date, slot.startTime, slot.dayName)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200",
                  selectedSlotId === slot.id
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-muted-foreground/30",
                  index === 0 && selectedSlotId === "" && "border-primary/30 bg-primary/5",
                )}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="font-medium">{slot.dayName}</span>
                <span className="text-xs text-muted-foreground">{dateFormatted}</span>
                {index === 0 && selectedSlotId === "" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    Próximo
                  </Badge>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {slot.startTime}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        canGoNext={!!selectedSlotId}
        isFirst={false}
        isLast={false}
      />
    </div>
  )
}
