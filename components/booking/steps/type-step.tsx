"use client"

import type { BookingType } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, CreditCard, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepNavigation } from "../step-navigation"

interface TypeStepProps {
  mentoringType: BookingType
  onSelect: (type: BookingType) => void
  onNext: () => void
}

const TYPE_OPTIONS: {
  value: BookingType
  label: string
  description: string
  icon: typeof GraduationCap
  badge?: string
  badgeVariant?: "default" | "secondary"
}[] = [
  {
    value: "free",
    label: "Mentoria Gratuita",
    description:
      "Sessão de 1h para iniciantes em programação ou transição de carreira para tecnologia.",
    icon: GraduationCap,
    badge: "Grátis",
    badgeVariant: "default",
  },
  {
    value: "paid",
    label: "Mentoria Paga",
    description:
      "Sessão aprofundada com foco em desafios técnicos, revisão de código ou preparação para entrevistas.",
    icon: CreditCard,
    badge: "PIX",
    badgeVariant: "secondary",
  },
  {
    value: "private",
    label: "Mentoria Particular",
    description:
      "Acompanhamento personalizado com agenda flexível e foco em objetivos específicos.",
    icon: Lock,
    badge: "PIX",
    badgeVariant: "secondary",
  },
]

export function TypeStep({ mentoringType, onSelect, onNext }: TypeStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Escolha o tipo de mentoria que melhor se encaixa no seu momento:
      </p>

      <div className="grid grid-cols-1 gap-3">
        {TYPE_OPTIONS.map(({ value, label, description, icon: Icon, badge, badgeVariant }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              "flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200",
              mentoringType === value
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-card/80",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                mentoringType === value
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {badge && (
                  <Badge variant={badgeVariant} className="text-[10px] px-2 py-0">
                    {badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </span>
            </div>
          </button>
        ))}
      </div>

      <StepNavigation
        onBack={() => {}}
        onNext={onNext}
        canGoNext={!!mentoringType}
        isFirst={true}
        isLast={false}
      />
    </div>
  )
}
