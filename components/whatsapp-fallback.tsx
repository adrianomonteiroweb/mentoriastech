"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"

/**
 * Botão de contato no WhatsApp do suporte, exibido como fallback quando algo
 * falha (ex.: não foi possível gerar o PIX). Mensagem opcional pré-preenchida.
 */
export function WhatsAppFallback({
  message,
  label = "Falar no WhatsApp",
  className,
}: {
  message?: string
  label?: string
  className?: string
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "min-h-11 w-fit border-[#25D366]/40 text-[#4ade80] hover:bg-[#25D366]/10 hover:text-[#4ade80]",
        className,
      )}
    >
      <a href={buildSupportWhatsAppUrl(message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  )
}
