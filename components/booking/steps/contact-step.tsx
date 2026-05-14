"use client"

import { User, Mail, Phone } from "lucide-react"
import { StepNavigation } from "../step-navigation"

interface ContactStepProps {
  name: string
  email: string
  whatsapp: string
  notes: string
  isAuthenticated: boolean
  onChangeName: (v: string) => void
  onChangeEmail: (v: string) => void
  onChangeWhatsapp: (v: string) => void
  onChangeNotes: (v: string) => void
  onNext: () => void
  onBack: () => void
}

export function ContactStep({
  name,
  email,
  whatsapp,
  isAuthenticated,
  onChangeName,
  onChangeEmail,
  onChangeWhatsapp,
  onNext,
  onBack,
}: ContactStepProps) {
  const canProceed = name.trim().length > 0 && email.trim().length > 0 && whatsapp.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      {isAuthenticated && (
        <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          Seus dados foram preenchidos automaticamente. Edite se necessário.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-name"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          <User className="h-3 w-3" />
          Nome e sobrenome
        </label>
        <input
          id="booking-name"
          type="text"
          required
          placeholder="Seu nome e sobrenome"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-email"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          <Mail className="h-3 w-3" />
          E-mail
        </label>
        <input
          id="booking-email"
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => onChangeEmail(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-whatsapp"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          <Phone className="h-3 w-3" />
          WhatsApp
        </label>
        <input
          id="booking-whatsapp"
          type="tel"
          required
          placeholder="(85) 99999-9999"
          value={whatsapp}
          onChange={(e) => onChangeWhatsapp(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        canGoNext={canProceed}
        isFirst={false}
        isLast={false}
      />
    </div>
  )
}
