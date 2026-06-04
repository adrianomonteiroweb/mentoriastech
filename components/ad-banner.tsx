"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Megaphone,
  MessageCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatWhatsAppNumber } from "@/lib/whatsapp"

interface Ad {
  id: string
  title: string
  description: string | null
  image_url: string | null
  image_alt: string | null
  whatsapp_number: string | null
  link_url: string | null
}

function trackEvent(adId: string, event: "view" | "click") {
  fetch(`/api/ads/${adId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {})
}

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [imageExpanded, setImageExpanded] = useState(false)
  const viewedAds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/ads")
      .then((response) => response.json())
      .then((json) => setAds(json.data || []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (ads.length === 0) return

    const ad = ads[current]
    if (!viewedAds.current.has(ad.id)) {
      viewedAds.current.add(ad.id)
      trackEvent(ad.id, "view")
    }
  }, [ads, current])

  const next = useCallback(() => {
    setCurrent((previous) => (previous + 1) % ads.length)
    setImageExpanded(false)
  }, [ads.length])

  const previous = useCallback(() => {
    setCurrent((currentIndex) => (currentIndex - 1 + ads.length) % ads.length)
    setImageExpanded(false)
  }, [ads.length])

  if (!loaded || ads.length === 0) return null

  const ad = ads[current]
  const imageAlt = ad.image_alt?.trim() || ad.title
  const whatsappUrl = ad.whatsapp_number
    ? `https://wa.me/${formatWhatsAppNumber(ad.whatsapp_number)}`
    : null
  const ctaUrl = whatsappUrl || ad.link_url
  const ctaLabel = whatsappUrl ? "Falar no WhatsApp" : "Conhecer serviço"
  const ctaHelper = whatsappUrl
    ? "Abre uma conversa no WhatsApp em uma nova aba."
    : "Abre o site do serviço em uma nova aba."
  const CtaIcon = whatsappUrl ? MessageCircle : ExternalLink

  return (
    <section aria-label="Serviço recomendado" className="relative w-full">
      <div className="overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-lg shadow-primary/5">
        <div
          aria-live="polite"
          className={ad.image_url ? "grid sm:grid-cols-[minmax(0,1.25fr)_minmax(14rem,0.75fr)]" : ""}
        >
          {ad.image_url && (
            <button
              type="button"
              onClick={() => setImageExpanded(true)}
              aria-label={`Ampliar imagem. ${imageAlt}`}
              className="group relative block min-h-44 w-full overflow-hidden border-b border-primary/20 bg-black text-left sm:min-h-full sm:border-b-0 sm:border-r"
            >
              <span className="relative block aspect-square w-full">
                <Image
                  src={ad.image_url}
                  alt={imageAlt}
                  fill
                  priority
                  loading="eager"
                  sizes="(max-width: 639px) calc(100vw - 2rem), 460px"
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                />
              </span>
              <span className="absolute bottom-3 left-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/30 bg-black/85 px-3 py-2 text-sm font-semibold text-white shadow-md">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                Ampliar imagem
              </span>
            </button>
          )}

          {ctaUrl && (
            <div className="space-y-2 border-b border-primary/20 bg-gradient-to-br from-card to-primary/10 p-3 sm:hidden">
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent(ad.id, "click")}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-center text-base font-bold text-white shadow-md shadow-green-950/20 transition-colors hover:bg-green-600 focus-visible:ring-white"
              >
                <CtaIcon className="h-5 w-5" aria-hidden="true" />
                {ctaLabel}
              </a>
              <p className="text-sm leading-relaxed text-foreground/75">{ctaHelper}</p>
            </div>
          )}

          <div className="flex min-w-0 flex-col justify-center gap-4 bg-gradient-to-br from-card via-card to-primary/10 p-4 sm:p-5">
            <div>
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                Serviço recomendado
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl">
                {ad.title}
              </h2>
              {ad.description && (
                <p className="break-words text-base leading-relaxed text-foreground/85">
                  {ad.description}
                </p>
              )}
            </div>

            {ctaUrl && (
              <div className="hidden space-y-2 sm:block">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent(ad.id, "click")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-center text-base font-bold text-white shadow-md shadow-green-950/20 transition-colors hover:bg-green-600 focus-visible:ring-white"
                >
                  <CtaIcon className="h-5 w-5" aria-hidden="true" />
                  {ctaLabel}
                </a>
                <p className="text-sm leading-relaxed text-foreground/75">
                  {ctaHelper}
                </p>
              </div>
            )}
          </div>
        </div>

        {ads.length > 1 && (
          <nav
            aria-label="Navegação entre anúncios"
            className="flex min-h-14 items-center justify-between gap-3 border-t border-primary/20 bg-background/70 px-3 py-2"
          >
            <button
              type="button"
              onClick={previous}
              aria-label="Ver anúncio anterior"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:bg-primary/15"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              Anúncio {current + 1} de {ads.length}
            </span>
            <button
              type="button"
              onClick={next}
              aria-label="Ver próximo anúncio"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:bg-primary/15"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>

      {ad.image_url && (
        <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
          <DialogContent className="max-h-[95vh] w-[calc(100%_-_1rem)] max-w-4xl overflow-y-auto p-3 sm:p-5">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl">{ad.title}</DialogTitle>
              <DialogDescription className="text-base leading-relaxed text-foreground/80">
                {ad.description || imageAlt}
              </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-black">
              <Image
                src={ad.image_url}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
                className="object-contain"
              />
            </div>
            {ctaUrl && (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent(ad.id, "click")}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-center text-base font-bold text-white transition-colors hover:bg-green-600 focus-visible:ring-white"
              >
                <CtaIcon className="h-5 w-5" aria-hidden="true" />
                {ctaLabel}
              </a>
            )}
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
