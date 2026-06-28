"use client"

import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Globe,
  Lock,
  Sparkles,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type {
  TrackEnrollmentWithDetails,
  TrackPhaseStatus,
} from "@/lib/types/database"

const STATUS_META: Record<
  TrackPhaseStatus,
  { label: string; icon: typeof Circle; className: string }
> = {
  locked: { label: "Bloqueada", icon: Lock, className: "text-muted-foreground/60" },
  pending: { label: "A agendar", icon: Circle, className: "text-primary" },
  scheduled: { label: "Agendada", icon: CalendarDays, className: "text-primary" },
  in_progress: { label: "Em andamento", icon: Clock, className: "text-amber-400" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "text-emerald-400" },
  skipped: { label: "Pulada", icon: Circle, className: "text-muted-foreground/40" },
}

function formatDate(date: string | null): string {
  if (!date) return ""
  const [, m, d] = date.split("-")
  return `${d}/${m}`
}

export function TrilhaRoadmap({
  enrollment,
}: {
  enrollment: TrackEnrollmentWithDetails
}) {
  const actionable = enrollment.phases.filter((p) => p.status !== "skipped")
  const completed = actionable.filter((p) => p.status === "completed").length
  const total = actionable.length || 1
  // Endowed progress: barra começa levemente preenchida (goal-gradient).
  const realPercent = Math.round((completed / total) * 100)
  const percent = enrollment.status === "pending" ? Math.max(6, realPercent) : realPercent
  const visiblePhases = enrollment.phases.filter((p) => p.status !== "skipped")

  return (
    <div className="flex flex-col gap-5">
      {enrollment.status === "pending" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-300">
            Inscrição pendente
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Estamos confirmando sua inscrição. Assim que for aprovada, a Fase 1
            será agendada no horário que você escolheu.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {enrollment.track?.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={enrollment.track.cover_image_url}
            alt={`Capa da trilha ${enrollment.track.title}`}
            loading="lazy"
            decoding="async"
            className="mx-auto h-auto w-full max-h-[40vh] object-contain bg-secondary/30"
          />
        )}
        <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {enrollment.track?.title || "Trilha"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fase {Math.min(completed + 1, total)} de {total}
            </p>
          </div>
          <Badge
            variant={enrollment.status === "completed" ? "default" : "secondary"}
          >
            {enrollment.status === "active" && "Em andamento"}
            {enrollment.status === "pending" && "Pendente"}
            {enrollment.status === "completed" && "Concluída"}
            {enrollment.status === "cancelled" && "Cancelada"}
          </Badge>
        </div>
        <Progress value={percent} className="mt-4" />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {visiblePhases.map((phase, index) => {
          const meta = STATUS_META[phase.status]
          const Icon = meta.icon
          const isEnglish = phase.phase_key === "english"
          return (
            <li
              key={phase.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {phase.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs",
                        meta.className,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>

                  {/* Agendamento da fase */}
                  {phase.booking && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {phase.booking.session_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(phase.booking.session_date)}
                          {phase.booking.start_time
                            ? ` às ${phase.booking.start_time.slice(0, 5)}`
                            : ""}
                        </span>
                      )}
                      {phase.booking.google_meet_url && (
                        <a
                          href={phase.booking.google_meet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Entrar na chamada
                        </a>
                      )}
                    </div>
                  )}

                  {/* Indicação de inglês */}
                  {isEnglish && enrollment.english_mentorship && (
                    <div className="mt-2 flex items-start gap-2 rounded-md bg-primary/5 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Indicação:{" "}
                        <strong className="text-foreground">
                          {enrollment.english_mentorship.title}
                        </strong>{" "}
                        — mentoria de inglês para acelerar esta fase.
                      </span>
                    </div>
                  )}

                  {/* Conteúdos da fase */}
                  {phase.content.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {phase.content.map((item) => (
                        <Link
                          key={item.id}
                          href={`/content/${item.id}`}
                          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {enrollment.target_international && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 text-primary" />
          Trilha preparada para vagas internacionais.
        </p>
      )}
    </div>
  )
}
