"use client"

import { useMemo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { WhatsAppFallback } from "@/components/whatsapp-fallback"
import { buildStaticPixPayload } from "@/lib/pix"

// PIX fixo de doacao. A chave e o CPF (somente digitos no payload; exibido
// formatado para o usuario). Nome/cidade sao informativos no BR Code — o app do
// pagador mostra o nome real da conta resolvido pela chave.
const PIX_KEY = "03440795381"
const PIX_KEY_DISPLAY = "034.407.953-81"
const PIX_MERCHANT_NAME = "MentoriasTech"
const PIX_MERCHANT_CITY = "FORTALEZA"

const DONATE_WHATSAPP_MESSAGE =
  "Olá! Tenho uma dúvida sobre a doação via PIX no site MentoriasTech. Pode me ajudar?"

export function DonateWidget() {
  const [copied, setCopied] = useState(false)

  const pixPayload = useMemo(
    () =>
      buildStaticPixPayload({
        key: PIX_KEY,
        merchantName: PIX_MERCHANT_NAME,
        merchantCity: PIX_MERCHANT_CITY,
      }),
    [],
  )

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pixPayload)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Em alguns navegadores o clipboard pode falhar; o usuario ainda pode
      // selecionar e copiar o texto manualmente.
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-center">
          <Heart className="h-5 w-5 text-rose-400" />
          <h3 className="text-base font-semibold text-foreground">
            Gostou do projeto? Apoie com qualquer valor.
          </h3>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Escaneie o QR Code ou use o PIX copia e cola. Você escolhe o valor no
          app do seu banco.
        </p>

        <div className="flex items-center justify-center rounded-lg border bg-white p-3">
          <QRCodeSVG
            value={pixPayload}
            size={192}
            level="M"
            aria-label="QR Code PIX para doacao"
          />
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="donate-pix-copy"
            className="text-sm font-medium text-foreground"
          >
            PIX copia e cola
          </label>
          <Textarea
            id="donate-pix-copy"
            readOnly
            value={pixPayload}
            rows={3}
            className="font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>

        <Button type="button" onClick={copyPix} className="min-h-11 w-full">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar PIX copia e cola"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Chave PIX (CPF):{" "}
          <span className="font-medium text-foreground">{PIX_KEY_DISPLAY}</span>
        </p>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs text-muted-foreground">Dúvidas sobre a doação?</p>
          <WhatsAppFallback message={DONATE_WHATSAPP_MESSAGE} />
        </div>
      </div>
    </div>
  )
}
