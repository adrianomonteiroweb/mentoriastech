"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Copy, Check, QrCode, Clock, RefreshCw, AlertCircle } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentStepProps {
  bookingData: {
    name: string
    email: string
    whatsapp: string
    topicId: string
    topicName: string
    bookingType: "paid" | "private"
    sessionDate: string
    startTime: string
    slotId: string
    notes: string
    menteeId: string | null
  }
  onSuccess: () => void
  onBack: () => void
}

type PaymentState = "creating" | "awaiting" | "succeeded" | "failed" | "expired"

export function PaymentStep({ bookingData, onSuccess, onBack }: PaymentStepProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("creating")
  const [clientSecret, setClientSecret] = useState("")
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState("")
  const [pixCopyPaste, setPixCopyPaste] = useState("")
  const [expiresAt, setExpiresAt] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const createPayment = useCallback(async () => {
    setPaymentState("creating")
    setError("")

    try {
      const res = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao criar pagamento")
      }

      const { clientSecret: secret } = await res.json()
      setClientSecret(secret)

      // Confirm PIX payment to get QR code
      const stripe = await stripePromise
      if (!stripe) throw new Error("Stripe não carregou")

      const { paymentIntent, error: confirmError } = await stripe.confirmPixPayment(
        secret,
        { payment_method: {} },
        { handleActions: false },
      )

      if (confirmError) {
        throw new Error(confirmError.message || "Erro ao confirmar PIX")
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextAction = paymentIntent?.next_action as any
      if (nextAction?.pix_display_qr_code) {
        const qr = nextAction.pix_display_qr_code
        setPixQrCodeUrl(qr.image_url_svg || "")
        setPixCopyPaste(qr.data || "")
        const expiry = Date.now() + 30 * 60 * 1000 // 30 minutes
        setExpiresAt(expiry)
        setPaymentState("awaiting")

        // Start polling for payment confirmation
        startPolling(secret)
        startTimer(expiry)
      } else {
        throw new Error("QR Code PIX não disponível")
      }
    } catch (err) {
      console.error("[payment-step] Error:", err)
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
      setPaymentState("failed")
    }
  }, [bookingData])

  function startPolling(secret: string) {
    cleanup()
    pollRef.current = setInterval(async () => {
      try {
        const stripe = await stripePromise
        if (!stripe) return

        const { paymentIntent } = await stripe.retrievePaymentIntent(secret)
        if (paymentIntent?.status === "succeeded") {
          cleanup()
          setPaymentState("succeeded")
          // Small delay for user to see the success state
          setTimeout(onSuccess, 1500)
        }
      } catch {
        // Polling errors are non-fatal
      }
    }, 5000)
  }

  function startTimer(expiry: number) {
    timerRef.current = setInterval(() => {
      const remaining = expiry - Date.now()
      if (remaining <= 0) {
        cleanup()
        setPaymentState("expired")
        setTimeLeft("00:00")
        return
      }
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`)
    }, 1000)
  }

  useEffect(() => {
    createPayment()
    return cleanup
  }, [createPayment, cleanup])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixCopyPaste)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = pixCopyPaste
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Creating state
  if (paymentState === "creating") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Gerando pagamento PIX...</p>
      </div>
    )
  }

  // Succeeded state
  if (paymentState === "succeeded") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-sm font-medium text-green-500">Pagamento confirmado!</p>
        <p className="text-xs text-muted-foreground">Finalizando sua reserva...</p>
      </div>
    )
  }

  // Failed state
  if (paymentState === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm font-medium text-destructive">Erro no pagamento</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">{error}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Voltar
          </Button>
          <Button size="sm" onClick={createPayment}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // Expired state
  if (paymentState === "expired") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-amber-500">PIX expirado</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          O tempo para pagamento se esgotou. Gere um novo QR Code para continuar.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Voltar
          </Button>
          <Button size="sm" onClick={createPayment}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Gerar novo PIX
          </Button>
        </div>
      </div>
    )
  }

  // Awaiting payment state
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código PIX para pagar:
        </p>
        <Badge variant="secondary" className="mt-2 text-lg font-bold">
          R$ 50,00
        </Badge>
      </div>

      {/* QR Code */}
      {pixQrCodeUrl ? (
        <div className="flex justify-center">
          <div className="rounded-xl border border-border bg-white p-4">
            <img
              src={pixQrCodeUrl}
              alt="QR Code PIX"
              className="h-48 w-48"
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-card">
            <QrCode className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Copy paste code */}
      {pixCopyPaste && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Copia e cola
          </label>
          <div className="flex gap-2">
            <code className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs break-all max-h-16 overflow-y-auto">
              {pixCopyPaste}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Expira em</span>
        <span className="font-mono font-bold text-foreground">{timeLeft}</span>
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Aguardando confirmação do pagamento...
      </div>

      {/* Back button */}
      <div className="flex justify-start pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
