import { formatWhatsAppNumber } from "@/lib/whatsapp"

export const DEFAULT_AD_WHATSAPP_MESSAGE =
  "Olá, gostaria de saber mais sobre seu trabalho"

export function buildAdWhatsAppUrl(number: string, message?: string | null): string {
  const text = message?.trim() || DEFAULT_AD_WHATSAPP_MESSAGE

  return `https://wa.me/${formatWhatsAppNumber(number)}?text=${encodeURIComponent(text)}`
}
