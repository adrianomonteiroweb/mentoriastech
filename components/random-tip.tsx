"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { EyeOff, Lightbulb, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { cn } from "@/lib/utils"
import type { TipPlacement } from "@/lib/types/database"

type PublicPlacement = Exclude<TipPlacement, "both">

interface RandomTip {
  id: string
  title: string
  body: string
}

interface RandomTipCardProps {
  placement: PublicPlacement
  className?: string
}

const LABELS: Record<PublicPlacement, { heading: string; refresh: string }> = {
  content: {
    heading: "Dica para aproveitar os conteúdos",
    refresh: "Mostrar outra dica de conteúdo",
  },
  jobs: {
    heading: "Dica para melhorar suas candidaturas",
    refresh: "Mostrar outra dica de vaga",
  },
}

export function RandomTipCard({ placement, className }: RandomTipCardProps) {
  const titleId = useId()
  const { hydrated, preferences, updatePreference } = useUserPreferences()
  const [tip, setTip] = useState<RandomTip | null>(null)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)

  const loadTip = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tips/random?placement=${placement}`)
      const json = await response.json()
      setTip(json.data || null)
    } catch {
      setTip(null)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [placement])

  useEffect(() => {
    if (!hydrated || !preferences.showTips) return

    loadTip()
  }, [hydrated, loadTip, preferences.showTips])

  if (!hydrated || !preferences.showTips) {
    return null
  }

  if (!loaded && loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4" aria-hidden="true">
        <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-secondary" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-secondary" />
      </div>
    )
  }

  if (!tip) return null

  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      aria-busy={loading}
      className={cn(
        "rounded-lg border border-primary/35 bg-primary/10 p-4 shadow-sm shadow-primary/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/70 text-primary">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-primary">
            {LABELS[placement].heading}
          </p>
          <h2 id={titleId} className="mt-1 text-base font-semibold leading-snug text-foreground">
            {tip.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {tip.body}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => updatePreference("showTips", false)}
          className="min-h-10"
        >
          <EyeOff className="h-4 w-4" />
          Ocultar dicas
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={loadTip}
          disabled={loading}
          aria-label={LABELS[placement].refresh}
          className="min-h-10"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Outra dica
        </Button>
      </div>
    </section>
  )
}
