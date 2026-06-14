"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Send,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PublicPaidMentorship } from "@/lib/types/database"

interface ScheduleSlot {
  id: string
  slotId: string
  dayName: string
  startTime: string
  slotType: "free" | "paid" | "private"
  date: string
  isAvailable: boolean
}

interface PaidBookingResult {
  booking: {
    id: string
    status: string
    session_date: string | null
    start_time: string | null
    date_label?: string
  }
  payment: {
    id: string
    status: string
    amount_cents: number
    currency: string
    pix?: {
      qr_code_data: string | null
      qr_code_image_url_png: string | null
      qr_code_image_url_svg: string | null
      hosted_instructions_url: string | null
      expires_at: string | null
    }
    pix_qr_code_data?: string | null
    pix_qr_code_image_url_png?: string | null
    pix_hosted_instructions_url?: string | null
    pix_expires_at?: string | null
  }
  paid_mentorship: PublicPaidMentorship
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100)
}

function formatDate(date: string) {
  return date.split("-").reverse().join("/")
}

function getPixData(result: PaidBookingResult | null) {
  if (!result) return null
  return {
    qrCodeData: result.payment.pix?.qr_code_data ?? result.payment.pix_qr_code_data ?? null,
    qrCodeImageUrlPng:
      result.payment.pix?.qr_code_image_url_png ??
      result.payment.pix_qr_code_image_url_png ??
      null,
    hostedInstructionsUrl:
      result.payment.pix?.hosted_instructions_url ??
      result.payment.pix_hosted_instructions_url ??
      null,
    expiresAt: result.payment.pix?.expires_at ?? result.payment.pix_expires_at ?? null,
  }
}

export function PaidBookingForm() {
  const [mentorships, setMentorships] = useState<PublicPaidMentorship[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [selectedMentorshipId, setSelectedMentorshipId] = useState("")
  const [selectedSlotId, setSelectedSlotId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [document, setDocument] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<PaidBookingResult | null>(null)
  const [error, setError] = useState("")
  const [dataError, setDataError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    const loadJson = async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Falha ao carregar ${url}`)
      return response.json()
    }

    Promise.allSettled([
      loadJson("/api/paid-mentorships"),
      loadJson("/api/schedule"),
      loadJson("/api/auth/me"),
    ])
      .then(([mentorshipsResult, scheduleResult, authResult]) => {
        if (mentorshipsResult.status === "fulfilled") {
          setMentorships(mentorshipsResult.value.data || [])
        } else {
          setDataError("Nao foi possivel carregar mentorias pagas.")
        }

        if (scheduleResult.status === "fulfilled") {
          setSlots(scheduleResult.value.schedule || [])
        } else {
          setDataError((current) =>
            current || "Nao foi possivel carregar horarios pagos.",
          )
        }

        if (authResult.status === "fulfilled" && authResult.value.user) {
          const user = authResult.value.user
          setName(user.full_name || "")
          setEmail(user.email || "")
          setWhatsapp(user.whatsapp || "")
        }
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [])

  const paidSlots = useMemo(
    () => slots.filter((slot) => slot.isAvailable && slot.slotType === "paid"),
    [slots],
  )
  const selectedMentorship = mentorships.find((item) => item.id === selectedMentorshipId)
  const selectedSlot = paidSlots.find((slot) => slot.id === selectedSlotId)
  const pix = getPixData(result)
  const isPaid = result?.payment.status === "confirmed" || result?.booking.status === "paid"

  async function copyPix() {
    if (!pix?.qrCodeData) return

    try {
      await navigator.clipboard.writeText(pix.qrCodeData)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Nao foi possivel copiar o Pix.")
    }
  }

  async function checkPaymentStatus() {
    if (!result) return
    setCheckingStatus(true)
    setStatusMessage("")
    setError("")

    try {
      const params = new URLSearchParams({
        bookingId: result.booking.id,
        paymentId: result.payment.id,
      })
      const response = await fetch(`/api/booking/paid?${params.toString()}`)
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || "Erro ao verificar pagamento")
      }

      const nextPayment = json.data.payment
      setResult((current) => {
        if (!current) return current
        return {
          ...current,
          booking: {
            ...current.booking,
            status: json.data.booking_status,
          },
          payment: {
            ...current.payment,
            ...nextPayment,
            pix: current.payment.pix,
          },
        }
      })

      setStatusMessage(
        nextPayment.status === "confirmed"
          ? "Pagamento confirmado. O mentor foi avisado."
          : "Pagamento ainda pendente.",
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro ao verificar pagamento")
    } finally {
      setCheckingStatus(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedMentorship || !selectedSlot) return

    setLoading(true)
    setError("")
    setStatusMessage("")

    try {
      const response = await fetch("/api/booking/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidMentorshipId: selectedMentorship.id,
          name,
          email,
          whatsapp,
          document: document || undefined,
          slotId: selectedSlot.slotId,
          sessionDate: selectedSlot.date,
          startTime: selectedSlot.startTime,
          notes,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Erro ao solicitar mentoria paga")
      }

      setResult(json)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro ao solicitar")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-primary/30 bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {isPaid ? "Pagamento confirmado" : "Pix gerado"}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {result.paid_mentorship.title} - {formatCurrency(result.payment.amount_cents, result.payment.currency)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {result.booking.session_date && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(result.booking.session_date)}
                  </Badge>
                )}
                {result.booking.start_time && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {result.booking.start_time.substring(0, 5)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isPaid && (
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {pix?.qrCodeImageUrlPng ? (
              <div className="flex items-center justify-center rounded-lg border bg-white p-3">
                <img
                  src={pix.qrCodeImageUrlPng}
                  alt="QR Code Pix da mentoria"
                  className="h-48 w-48 object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-lg border bg-secondary text-sm text-muted-foreground">
                QR indisponivel
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pix-copy">Pix copia e cola</Label>
                <Textarea
                  id="pix-copy"
                  readOnly
                  value={pix?.qrCodeData || ""}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={copyPix} disabled={!pix?.qrCodeData}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar Pix"}
                </Button>
                <Button type="button" variant="outline" onClick={checkPaymentStatus} disabled={checkingStatus}>
                  {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Verificar pagamento
                </Button>
                {pix?.hostedInstructionsUrl && (
                  <Button type="button" variant="ghost" asChild>
                    <a href={pix.hostedInstructionsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir instrucoes
                    </a>
                  </Button>
                )}
              </div>
              {pix?.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expira em {new Date(pix.expiresAt).toLocaleString("pt-BR")}.
                </p>
              )}
            </div>
          </div>
        )}

        {statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setResult(null)
            setSelectedSlotId("")
            setNotes("")
            setStatusMessage("")
            setError("")
          }}
        >
          Solicitar outra mentoria
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Mentoria paga</Label>
        {dataError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {dataError}
          </div>
        )}
        {dataLoading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando mentorias...
          </div>
        ) : mentorships.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            Nenhuma mentoria paga ativa no momento.
          </div>
        ) : (
          <div className="grid gap-3">
            {mentorships.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMentorshipId(item.id)}
                className={cn(
                  "grid gap-3 rounded-lg border bg-card p-3 text-left transition-colors sm:grid-cols-[88px_minmax(0,1fr)]",
                  selectedMentorshipId === item.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                    : "hover:border-primary/40",
                )}
              >
                {item.image_url ? (
                  <div className="relative aspect-square overflow-hidden rounded-md border bg-black">
                    <Image
                      src={item.image_url}
                      alt={item.image_alt || item.title}
                      fill
                      sizes="88px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-md bg-secondary text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(item.amount_cents, item.currency)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Horario pago</Label>
        {dataLoading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando horarios...
          </div>
        ) : paidSlots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            Nenhum horario pago disponivel no momento.
          </div>
        ) : (
          <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1">
            {paidSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  selectedSlotId === slot.id
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="font-medium">{slot.dayName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(slot.date)}</span>
                <span className="ml-auto flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {slot.startTime}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-name">Nome</Label>
          <Input id="paid-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-email">Email</Label>
          <Input id="paid-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-whatsapp">WhatsApp</Label>
          <Input id="paid-whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-document">CPF (opcional)</Label>
          <Input
            id="paid-document"
            inputMode="numeric"
            placeholder="Somente numeros"
            value={document}
            onChange={(event) => setDocument(event.target.value.replace(/\D/g, "").slice(0, 14))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paid-notes">Observacoes</Label>
        <Textarea
          id="paid-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Conte rapidamente o que gostaria de trabalhar na sessao."
        />
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !selectedMentorship || !selectedSlot || !name || !email || !whatsapp}
        className="min-h-12 text-base"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {loading ? "Gerando Pix..." : "Gerar Pix e solicitar"}
      </Button>
    </form>
  )
}
