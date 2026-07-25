"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "mentoriastech-cookie-consent"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {}
  }, [])

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted")
    } catch {}
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:flex sm:items-center sm:justify-center">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:max-w-xl">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Este site usa cookies para melhorar sua experiência e exibir anúncios
          personalizados via Google AdSense.{" "}
          <Link
            href="/politica-de-privacidade"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Política de Privacidade
          </Link>
        </p>
        <Button
          onClick={accept}
          size="sm"
          className="shrink-0 rounded-full"
        >
          Aceitar
        </Button>
      </div>
    </div>
  )
}
