"use client";

import { useState } from "react";
import Image from "next/image";
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
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UnifiedBookingState } from "@/lib/types/booking";
import type { PublicPaidMentorship } from "@/lib/types/database";

interface PaidBookingResult {
  booking: {
    id: string;
    status: string;
    session_date: string | null;
    start_time: string | null;
  };
  payment: {
    id: string;
    status: string;
    amount_cents: number;
    currency: string;
    pix?: {
      qr_code_data: string | null;
      qr_code_image_url_png: string | null;
      qr_code_image_url_svg: string | null;
      hosted_instructions_url: string | null;
      expires_at: string | null;
    };
    pix_qr_code_data?: string | null;
    pix_qr_code_image_url_png?: string | null;
    pix_hosted_instructions_url?: string | null;
    pix_expires_at?: string | null;
  };
  paid_mentorship: PublicPaidMentorship;
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatDate(date: string) {
  return date.split("-").reverse().join("/");
}

function getPixData(result: PaidBookingResult | null) {
  if (!result) return null;
  return {
    qrCodeData:
      result.payment.pix?.qr_code_data ??
      result.payment.pix_qr_code_data ??
      null,
    qrCodeImageUrlPng:
      result.payment.pix?.qr_code_image_url_png ??
      result.payment.pix_qr_code_image_url_png ??
      null,
    hostedInstructionsUrl:
      result.payment.pix?.hosted_instructions_url ??
      result.payment.pix_hosted_instructions_url ??
      null,
    expiresAt:
      result.payment.pix?.expires_at ?? result.payment.pix_expires_at ?? null,
  };
}

interface PaidPaymentStepProps {
  state: UnifiedBookingState;
  paidMentorship: PublicPaidMentorship;
  onBack: () => void;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function PaidPaymentStep({
  state,
  paidMentorship,
  onBack,
}: PaidPaymentStepProps) {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<PaidBookingResult | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const pix = getPixData(result);
  const isPaid =
    result?.payment.status === "confirmed" || result?.booking.status === "paid";

  async function copyPix() {
    if (!pix?.qrCodeData) return;
    try {
      await navigator.clipboard.writeText(pix.qrCodeData);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Não foi possível copiar o Pix.");
    }
  }

  async function checkPaymentStatus() {
    if (!result) return;
    setCheckingStatus(true);
    setStatusMessage("");
    setError("");

    try {
      const params = new URLSearchParams({
        bookingId: result.booking.id,
        paymentId: result.payment.id,
      });
      const response = await fetch(`/api/booking/paid?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Erro ao verificar pagamento");
      }

      const nextPayment = json.data.payment;
      setResult((current) => {
        if (!current) return current;
        return {
          ...current,
          booking: { ...current.booking, status: json.data.booking_status },
          payment: {
            ...current.payment,
            ...nextPayment,
            pix: current.payment.pix,
          },
        };
      });

      setStatusMessage(
        nextPayment.status === "confirmed"
          ? "Pagamento confirmado! O mentor foi avisado e entrará em contato."
          : "Pagamento ainda pendente. Tente novamente em alguns segundos.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro ao verificar pagamento",
      );
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleSubmit() {
    if (state.slotId && !UUID_PATTERN.test(state.slotId)) {
      setError("Horário inválido. Selecione novamente um horário disponível.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/booking/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidMentorshipId: paidMentorship.id,
          name: state.name,
          email: state.email,
          whatsapp: state.whatsapp,
          slotId: state.slotId || undefined,
          sessionDate: state.sessionDate || undefined,
          startTime: state.startTime || undefined,
          notes: state.notes || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Erro ao solicitar mentoria paga");
      }

      setResult(json);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro ao solicitar",
      );
    } finally {
      setLoading(false);
    }
  }

  // After PIX is generated, show the payment UI
  if (result) {
    return (
      <div className="flex flex-col gap-5" aria-label="Pagamento via PIX">
        <div className="rounded-lg border border-primary/30 bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {isPaid ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {isPaid
                  ? "Pagamento confirmado!"
                  : "PIX gerado — escaneie ou copie"}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {paidMentorship.title} —{" "}
                {formatCurrency(
                  result.payment.amount_cents,
                  result.payment.currency,
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {result.booking.session_date && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    {formatDate(result.booking.session_date)}
                  </Badge>
                )}
                {result.booking.start_time && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {result.booking.start_time.substring(0, 5)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isPaid && (
          <div className="flex flex-col gap-4">
            {pix?.qrCodeImageUrlPng ? (
              <div className="flex items-center justify-center rounded-lg border bg-white p-3 mx-auto">
                <img
                  src={pix.qrCodeImageUrlPng}
                  alt="QR Code PIX para pagamento da mentoria"
                  className="h-48 w-48 object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border bg-secondary text-sm text-muted-foreground">
                QR Code indisponível
              </div>
            )}

            <div className="flex flex-col gap-3">
              {pix?.qrCodeData && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pix-copy"
                    className="text-sm font-medium text-foreground"
                  >
                    PIX copia e cola
                  </label>
                  <Textarea
                    id="pix-copy"
                    readOnly
                    value={pix.qrCodeData}
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={copyPix}
                  disabled={!pix?.qrCodeData}
                  className="min-h-11"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? "Copiado!" : "Copiar PIX"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkPaymentStatus}
                  disabled={checkingStatus}
                  className="min-h-11"
                >
                  {checkingStatus ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Verificar pagamento
                </Button>
                {pix?.hostedInstructionsUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    asChild
                    className="min-h-11"
                  >
                    <a
                      href={pix.hostedInstructionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Abrir instruções
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

        {isPaid && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm font-medium text-emerald-300">
              ✓ Pagamento confirmado! O mentor entrará em contato pelo WhatsApp
              para agendar a sessão.
            </p>
          </div>
        )}

        {statusMessage && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {statusMessage}
          </p>
        )}
        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Pre-submit: show summary + confirm button
  return (
    <div className="flex flex-col gap-5" aria-label="Resumo do pagamento">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          {paidMentorship.image_url ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-black">
              <Image
                src={paidMentorship.image_url}
                alt={paidMentorship.image_alt || paidMentorship.title}
                fill
                sizes="56px"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Star className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {paidMentorship.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {paidMentorship.description}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300 mt-1">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              {formatCurrency(
                paidMentorship.amount_cents,
                paidMentorship.currency,
              )}
            </span>
          </div>
        </div>
      </div>

      {state.sessionDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span>
            {state.dayName}, {formatDate(state.sessionDate)} às{" "}
            {state.startTime}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{state.name}</span>
        <span>•</span>
        <span>{state.email}</span>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="min-h-11"
        >
          Voltar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={cn("flex-1 min-h-12 text-base", loading && "opacity-70")}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
          {loading ? "Gerando PIX..." : "Gerar PIX e confirmar"}
        </Button>
      </div>
    </div>
  );
}
