"use client"

import { CreditCard, Mail, Megaphone, Phone, RefreshCcw, User } from "lucide-react"
import { ORIGIN_OPTIONS, type OriginCategoryValue } from "@/lib/types/booking"
import { StepNavigation } from "../step-navigation"

interface ContactStepProps {
  name: string
  email: string
  whatsapp: string
  notes: string
  document?: string
  mentoringType?: string
  isReturningMentee?: boolean
  originCategory?: OriginCategoryValue
  originDescription?: string
  isAuthenticated: boolean
  onChangeName: (v: string) => void
  onChangeEmail: (v: string) => void
  onChangeWhatsapp: (v: string) => void
  onChangeNotes: (v: string) => void
  onChangeDocument?: (v: string) => void
  onChangeReturningMentee?: (v: boolean) => void
  onChangeOrigin?: (category: OriginCategoryValue, description: string) => void
  onNext: () => void
  onBack: () => void
}

function choiceClass(active: boolean) {
  return `flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
  }`
}

export function ContactStep({
  name,
  email,
  whatsapp,
  document = "",
  mentoringType,
  isReturningMentee = false,
  originCategory = "",
  originDescription = "",
  isAuthenticated,
  onChangeName,
  onChangeEmail,
  onChangeWhatsapp,
  onChangeDocument = () => {},
  onChangeReturningMentee = () => {},
  onChangeOrigin = () => {},
  onNext,
  onBack,
}: ContactStepProps) {
  const isPaid = mentoringType === "paid"
  const canProceed =
    email.trim().length > 0 &&
    (isReturningMentee ||
      (name.trim().length > 0 &&
        whatsapp.trim().length > 0 &&
        originCategory.length > 0))

  return (
    <div className="flex flex-col gap-4">
      {isAuthenticated && (
        <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          Seus dados foram preenchidos automaticamente. Edite se necessário.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <RefreshCcw className="h-3 w-3" />
          Voce ja fez mentoria antes?
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeReturningMentee(false)}
            className={choiceClass(!isReturningMentee)}
          >
            Primeira vez
          </button>
          <button
            type="button"
            onClick={() => onChangeReturningMentee(true)}
            className={choiceClass(isReturningMentee)}
          >
            Ja fui mentorado
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-email"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          <Mail className="h-3 w-3" />
          {isReturningMentee ? "E-mail usado antes" : "E-mail"}
        </label>
        <input
          id="booking-email"
          type="email"
          required
          placeholder={isReturningMentee ? "email usado no agendamento anterior" : "seu@email.com"}
          value={email}
          onChange={(e) => onChangeEmail(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {!isReturningMentee && (
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
      )}

      {!isReturningMentee && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="booking-origin"
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              <Megaphone className="h-3 w-3" />
              Onde conheceu a mentoria?
            </label>
            <select
              id="booking-origin"
              required
              value={originCategory}
              onChange={(e) =>
                onChangeOrigin(e.target.value as OriginCategoryValue, originDescription)
              }
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="">Selecione uma origem</option>
              {ORIGIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="booking-origin-description"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Detalhes opcionais
            </label>
            <input
              id="booking-origin-description"
              type="text"
              value={originDescription}
              onChange={(e) => onChangeOrigin(originCategory, e.target.value)}
              placeholder="Ex.: nome do evento, pessoa que indicou..."
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>
      )}

      {!isReturningMentee && (
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
      )}

      {isPaid && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="booking-document"
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            <CreditCard className="h-3 w-3" />
            CPF (opcional)
          </label>
          <input
            id="booking-document"
            type="text"
            inputMode="numeric"
            placeholder="Somente numeros"
            value={document}
            onChange={(e) => onChangeDocument(e.target.value.replace(/\D/g, "").slice(0, 14))}
            className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            Pode ser exigido pelo banco para gerar o Pix.
          </p>
        </div>
      )}

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
