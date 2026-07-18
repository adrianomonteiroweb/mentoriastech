"use client"

import { useMemo, useState } from "react"
import PhoneInput, { isValidPhoneNumber, type Value } from "react-phone-number-input/max"
import flags from "react-phone-number-input/flags"
import ptBR from "react-phone-number-input/locale/pt-BR"
import { cn } from "@/lib/utils"
import { phoneNumberForInput } from "@/lib/whatsapp"

interface PhoneNumberInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
  "aria-describedby"?: string
  showHint?: boolean
}

export function PhoneNumberInput({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  className,
  "aria-describedby": describedBy,
  showHint = true,
}: PhoneNumberInputProps) {
  const [touched, setTouched] = useState(false)
  const inputValue = useMemo(() => phoneNumberForInput(value) as Value | undefined, [value])
  const isInvalid = touched && inputValue ? !isValidPhoneNumber(inputValue) : false
  const hintId = `${id}-phone-hint`
  const errorId = `${id}-phone-error`
  const descriptionIds = [describedBy, showHint ? hintId : null, isInvalid ? errorId : null]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      <PhoneInput
        id={id}
        name={id}
        value={inputValue}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onBlur={() => setTouched(true)}
        defaultCountry="BR"
        labels={ptBR}
        flags={flags}
        addInternationalOption={false}
        required={required}
        disabled={disabled}
        autoComplete="tel"
        aria-describedby={descriptionIds || undefined}
        aria-invalid={isInvalid || undefined}
        placeholder="Digite o número"
        className={cn(
          "phone-number-input min-h-11 rounded-lg border border-border bg-secondary px-3 text-sm transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          isInvalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      />
      {showHint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          Selecione o país ou cole o número completo com +.
        </p>
      )}
      {isInvalid && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          Confira o país e o número informado.
        </p>
      )}
    </>
  )
}
