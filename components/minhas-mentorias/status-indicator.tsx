import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarCheck,
  CreditCard,
  Hourglass,
  CircleDot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BookingStatus } from "@/lib/types/database"

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pendente",
    icon: Hourglass,
    className: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle2,
    className: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  payment_pending: {
    label: "Aguardando Pgto",
    icon: CreditCard,
    className: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  },
  paid: {
    label: "Pago",
    icon: CreditCard,
    className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  scheduled: {
    label: "Agendado",
    icon: CalendarCheck,
    className: "text-primary bg-primary/10 border-primary/30",
  },
  completed: {
    label: "Concluído",
    icon: CircleDot,
    className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    className: "text-red-500 bg-red-500/10 border-red-500/30",
  },
}

interface StatusIndicatorProps {
  status: BookingStatus
  size?: "sm" | "md"
}

export function StatusIndicator({ status, size = "sm" }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 font-medium",
        size === "sm" ? "py-0.5 text-xs" : "py-1 text-sm",
        config.className,
      )}
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden="true" />
      {config.label}
    </span>
  )
}

export function getStatusLabel(status: BookingStatus): string {
  return STATUS_CONFIG[status]?.label ?? status
}
