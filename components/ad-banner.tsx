"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { formatWhatsAppNumber } from "@/lib/whatsapp"

interface Ad {
  id: string
  title: string
  description: string | null
  image_url: string | null
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
  const viewedAds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((json) => setAds(json.data || []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Rastrear visualização quando o anúncio é exibido
  useEffect(() => {
    if (ads.length === 0) return
    const ad = ads[current]
    if (!viewedAds.current.has(ad.id)) {
      viewedAds.current.add(ad.id)
      trackEvent(ad.id, "view")
    }
  }, [ads, current])

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % ads.length)
  }, [ads.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + ads.length) % ads.length)
  }, [ads.length])

  useEffect(() => {
    if (ads.length <= 1) return
    const interval = setInterval(next, 5000)
    return () => clearInterval(interval)
  }, [ads.length, next])

  if (!loaded || ads.length === 0) return null

  const ad = ads[current]
  const whatsappUrl = ad.whatsapp_number
    ? `https://wa.me/${formatWhatsAppNumber(ad.whatsapp_number)}`
    : null
  const ctaUrl = whatsappUrl || ad.link_url

  return (
    <div className="relative w-full">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
          {ad.image_url && (
            <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden border-2 border-primary/30">
              <Image
                src={ad.image_url}
                alt={ad.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                Indicação
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground break-words">{ad.title}</h3>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>

          {ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent(ad.id, "click")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          )}
        </div>

        {ads.length > 1 && (
          <div className="flex items-center justify-center gap-3 pb-3">
            <button
              onClick={prev}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {ads.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
