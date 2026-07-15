"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[]
  }
}

interface GoogleAdProps {
  className?: string
}

export function GoogleAd({ className }: GoogleAdProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4937617018904097"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
