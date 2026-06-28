"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Route } from "lucide-react"
import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { TrilhaRoadmap } from "@/components/minhas-mentorias/trilha/trilha-roadmap"
import { TrilhaEnrollForm } from "@/components/trilhas/trilha-enroll-form"
import type {
  LearningTrackWithPhases,
  TrackEnrollmentWithDetails,
} from "@/lib/types/database"

interface Props {
  email: string
}

export function TrilhaClient({ email }: Props) {
  const [enrollments, setEnrollments] = useState<TrackEnrollmentWithDetails[]>([])
  const [tracks, setTracks] = useState<LearningTrackWithPhases[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/minhas-mentorias/trilha")
      .then((res) => res.json())
      .then((json) => {
        setEnrollments(json.data?.enrollments || [])
        setTracks(json.data?.tracks || [])
      })
      .catch(() => {
        setEnrollments([])
        setTracks([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeEnrollments = enrollments.filter((e) => e.status !== "cancelled")

  return (
    <MentoriasShell email={email} title="Minha Trilha">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activeEnrollments.length > 0 ? (
          <div className="flex flex-col gap-8">
            {activeEnrollments.map((enrollment) => (
              <TrilhaRoadmap key={enrollment.id} enrollment={enrollment} />
            ))}

            {tracks.length > activeEnrollments.length && (
              <details className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Inscrever-se em outra trilha
                </summary>
                <div className="mt-4">
                  <TrilhaEnrollForm
                    tracks={tracks.filter(
                      (t) =>
                        !activeEnrollments.some((e) => e.track_id === t.id),
                    )}
                    mode="authenticated"
                    endpoint="/api/minhas-mentorias/trilha"
                    onSuccess={load}
                  />
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Route className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Comece sua trilha
              </h1>
              <p className="text-sm text-muted-foreground">
                Um percurso guiado do posicionamento à contratação. Escolha o
                horário da primeira fase e envie sua inscrição.
              </p>
            </div>

            {tracks.length > 0 ? (
              <div className="rounded-lg border border-border bg-card p-5">
                <TrilhaEnrollForm
                  tracks={tracks}
                  mode="authenticated"
                  endpoint="/api/minhas-mentorias/trilha"
                  onSuccess={load}
                />
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Nenhuma trilha disponível no momento.
              </p>
            )}
          </div>
        )}
      </div>
    </MentoriasShell>
  )
}
