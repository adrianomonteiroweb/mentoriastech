"use client"

import { useEffect } from "react"
import { trackPageEvent } from "@/lib/track-page"

interface PageViewTrackerProps {
  path?: string
}

// Dispara um evento de "visit" uma única vez por sessão para o path informado.
export function PageViewTracker({ path = "/" }: PageViewTrackerProps) {
  useEffect(() => {
    const key = `page_visit_tracked:${path}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // sessionStorage indisponível (ex: modo restrito) — segue e registra a visita
    }
    trackPageEvent("visit", undefined, path)
  }, [path])

  return null
}
