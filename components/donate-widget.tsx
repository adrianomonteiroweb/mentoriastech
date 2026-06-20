"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WhatsAppFallback } from "@/components/whatsapp-fallback"
import { cn } from "@/lib/utils"

const QUICK_AMOUNTS = [
  { label: "R$ 5", cents: 500 },
  { label: "R$ 10", cents: 1000 },
  { label: "R$ 20", cents: 2000 },
]

const DONATE_WHATSAPP_MESSAGE =
  "Olá! Tive um problema ao gerar o PIX de doação no site MentoriasTech. Pode me ajudar?"

interface DonateResult {
  qr_code_data: string | null
  qr_code_image_url_png: string | null
  expires_at: string | null
}

export function DonateWidget() {
  const [selectedCents, setSelectedCents] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<DonateResult | null>(null)
  const [copied, setCopied] = useState(false)

  function getAmountCents(): number | null {
    if (selectedCents) return selectedCents
    const parsed = Number(customAmount)
    if (!customAmount || Number.isNaN(parsed) || parsed < 1) return null
    return Math.round(parsed * 100)
  }

  function handleQuickAmount(cents: number) {
    setSelectedCents(cents)
    setCustomAmount("")
    setError("")
  }

  function handleCustomChange(value: string) {
    setCustomAmount(value)
    setSelectedCents(null)
    setError("")
  }

  function reset() {
    setResult(null)
    setError("")
    setCopied(false)
  }

  async function copyPix() {
    if (!result?.qr_code_data) return
    try {
      await navigator.clipboard.writeText(result.qr_code_data)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Nao foi possivel copiar o PIX.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amountCents = getAmountCents()
    if (!amountCents || amountCents < 100) {
      setError("Selecione ou digite um valor (minimo R$1).")
      return
    }
    if (amountCents > 100_000) {
      setError("Valor maximo: R$1.000.")
      return
    }
    if (!email.trim()) {
      setError("Informe seu email.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), amountCents }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Erro ao gerar PIX")
      }

      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PIX")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-center">
            <Heart className="h-5 w-5 text-rose-400" />
            <h3 className="text-base font-semibold text-foreground">
              Obrigado pelo apoio!
            </h3>
          </div>

          {result.qr_code_data ? (
            <div className="flex items-center justify-center rounded-lg border bg-white p-3">
              <QRCodeSVG
                value={result.qr_code_data}
                size={192}
                level="M"
                aria-label="QR Code PIX para doacao"
              />
            </div>
          ) : result.qr_code_image_url_png ? (
            <div className="flex items-center justify-center rounded-lg border bg-white p-3">
              <img
                src={result.qr_code_image_url_png}
                alt="QR Code PIX para doacao"
                className="h-48 w-48 object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex min-h-24 w-full items-center justify-center rounded-lg border bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
                Não foi possível exibir o QR Code. Use o PIX copia e cola abaixo ou fale com a gente.
              </div>
              <WhatsAppFallback message={DONATE_WHATSAPP_MESSAGE} />
            </div>
          )}

          {result.qr_code_data && (
            <div className="flex w-full flex-col gap-1.5">
              <label htmlFor="donate-pix-copy" className="text-sm font-medium text-foreground">
                PIX copia e cola
              </label>
              <Textarea
                id="donate-pix-copy"
                readOnly
                value={result.qr_code_data}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyPix} disabled={!result.qr_code_data} className="min-h-11">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar PIX"}
            </Button>
            <Button type="button" variant="outline" onClick={reset} className="min-h-11">
              Voltar
            </Button>
          </div>

          {result.expires_at && (
            <p className="text-xs text-muted-foreground">
              Expira em {new Date(result.expires_at).toLocaleString("pt-BR")}.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400" />
          <h3 className="text-base font-semibold text-foreground">
            Gostou do projeto? Apoie com qualquer valor.
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((opt) => (
            <button
              key={opt.cents}
              type="button"
              onClick={() => handleQuickAmount(opt.cents)}
              className={cn(
                "min-h-10 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                selectedCents === opt.cents
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Input
          type="number"
          min={1}
          max={1000}
          step={1}
          placeholder="Outro valor (R$)"
          value={customAmount}
          onChange={(e) => handleCustomChange(e.target.value)}
          className="min-h-11"
        />

        <Input
          type="email"
          placeholder="Seu email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError("") }}
          className="min-h-11"
        />

        {error && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
            <p className="text-xs text-muted-foreground">
              Problemas para gerar o PIX? Fale com a gente que ajudamos com a sua doação.
            </p>
            <WhatsAppFallback message={DONATE_WHATSAPP_MESSAGE} />
          </div>
        )}

        <Button type="submit" disabled={loading} className={cn("min-h-12 text-base", loading && "opacity-70")}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
          {loading ? "Gerando PIX..." : "Gerar PIX"}
        </Button>
      </div>
    </form>
  )
}
