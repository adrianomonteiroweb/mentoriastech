/**
 * Formata número de telefone brasileiro para link do WhatsApp.
 * Se o número tem 10 ou 11 dígitos (DDD + número), adiciona o código do país 55.
 */
export function formatWhatsAppNumber(input: string): string {
  const digits = input.replace(/\D/g, "")

  // 11 dígitos = DDD (2) + celular (9) — ex: 85986663753
  // 10 dígitos = DDD (2) + fixo (8) — ex: 8532123456
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  // Já inclui código do país (13 dígitos para celular BR) ou formato internacional
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
