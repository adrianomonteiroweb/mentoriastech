"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Globe, Loader2, Route } from "lucide-react"
import Link from "next/link"
import { DonateWidget } from "@/components/donate-widget"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TrilhaEnrollForm } from "@/components/trilhas/trilha-enroll-form"
import type { LearningTrackWithPhases } from "@/lib/types/database"

export default function TrilhasPage() {
  const [tracks, setTracks] = useState<LearningTrackWithPhases[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollTrack, setEnrollTrack] = useState<LearningTrackWithPhases | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null)

  useEffect(() => {
    fetch("/api/trilhas")
      .then((res) => res.json())
      .then((json) => setTracks(json.data || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Carregando trilhas</span>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 md:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-10 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Route className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              Trilhas de Recolocação
            </h1>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            Um percurso guiado do posicionamento à contratação. Inscreva-se em
            poucos cliques e acompanhe seu progresso em Minhas Mentorias.
          </p>
        </div>

        {tracks.length === 0 ? (
          <p className="py-8 text-center text-base text-muted-foreground">
            Nenhuma trilha disponível no momento.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                {track.cover_image_url && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        url: track.cover_image_url!,
                        alt: `Capa da trilha ${track.title}`,
                      })
                    }
                    aria-label={`Ampliar capa da trilha ${track.title}`}
                    className="block w-full cursor-zoom-in bg-secondary/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={track.cover_image_url}
                      alt={`Capa da trilha ${track.title}`}
                      loading="lazy"
                      decoding="async"
                      className="mx-auto h-auto w-full max-h-[60vh] object-contain"
                    />
                  </button>
                )}
                <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {track.title}
                    </h2>
                    {track.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {track.description}
                      </p>
                    )}
                  </div>
                  {track.supports_english && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Globe className="h-3 w-3" /> Internacional
                    </Badge>
                  )}
                </div>

                <ol className="mt-4 flex flex-col gap-1.5">
                  {track.phases
                    .filter((p) => p.phase_key !== "english" || track.supports_english)
                    .map((phase, index) => (
                      <li
                        key={phase.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {index + 1}
                        </span>
                        {phase.title}
                        {phase.is_optional && (
                          <span className="text-xs text-muted-foreground/70">
                            (opcional)
                          </span>
                        )}
                      </li>
                    ))}
                </ol>

                <Button
                  type="button"
                  className="mt-5 w-full sm:w-auto"
                  onClick={() => setEnrollTrack(track)}
                >
                  Solicitar trilha
                </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DonateWidget />
      </div>

      <Dialog
        open={Boolean(enrollTrack)}
        onOpenChange={(open) => !open && setEnrollTrack(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar trilha</DialogTitle>
            <DialogDescription>
              {enrollTrack?.title}. Escolha o horário da primeira fase e envie
              sua inscrição.
            </DialogDescription>
          </DialogHeader>
          {enrollTrack && (
            <TrilhaEnrollForm
              tracks={[enrollTrack]}
              mode="public"
              endpoint="/api/trilhas/enroll"
              defaultTrackId={enrollTrack.id}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(lightbox)}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto p-2 sm:p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>{lightbox?.alt}</DialogTitle>
          </DialogHeader>
          {lightbox && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={lightbox.alt}
              className="h-auto w-full rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
