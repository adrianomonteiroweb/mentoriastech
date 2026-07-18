import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max"

export const DEFAULT_PHONE_COUNTRY: CountryCode = "BR"

/** Converte registros brasileiros legados e números internacionais para a UI. */
export function phoneNumberForInput(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("+")) return trimmed

  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return undefined

  // Compatibilidade com os registros antigos: DDD + número sem DDI.
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return `+${digits}`
}

/** Normaliza e valida no padrão E.164. Retorna null quando o número é inválido. */
export function normalizePhoneNumber(
  input: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const value = trimmed.startsWith("+") ? trimmed : phoneNumberForInput(trimmed) || trimmed
  const phone = parsePhoneNumberFromString(value, defaultCountry)
  return phone?.isValid() ? phone.number : null
}

/** Formata um E.164 para o wa.me e mantém compatibilidade com dados legados. */
export function formatWhatsAppNumber(input: string): string {
  const normalized = normalizePhoneNumber(input)
  if (normalized) return normalized.slice(1)

  const digits = input.replace(/\D/g, "")
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

/**
 * Número de WhatsApp de contato/suporte do MentoriasTech (já com DDI 55).
 * Fonte única — usado em redes sociais e nos fallbacks de falha (ex.: PIX).
 */
export const SUPPORT_WHATSAPP_NUMBER = "5585986663753"

/**
 * Monta o link de contato no WhatsApp do suporte, com mensagem opcional pré-preenchida.
 */
export function buildSupportWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
