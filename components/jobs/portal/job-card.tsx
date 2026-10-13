"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Flag,
  Globe,
  Heart,
  Languages,
  MapPin,
  XCircle,
} from "lucide-react"
import { ShareButton } from "@/components/share-button"
import { cn } from "@/lib/utils"
import { formatJobActiveHours, getJobActiveHours } from "@/lib/job-active-time"
import { parseSummaryRows } from "@/lib/job-summary"
import {
  JOB_TYPE_LABELS,
  getJobLevelLabel,
  getLanguageLevelLabel,
} from "@/lib/job-labels"
import { getAreaSpecialtyLabel, getInclusionLabel } from "@/lib/job-areas"
import type { JobListItem } from "@/lib/db/job-listing"

const JOB_TYPE_CLASSES: Record<string, string> = {
  remote: "bg-job-remote-bg text-job-remote",
  hybrid: "bg-job-hybrid-bg text-job-hybrid",
  onsite: "bg-job-onsite-bg text-job-onsite",
}

export type JobCardProps = {
  job: JobListItem
  now: number
  highlighted?: boolean
  isLiked: boolean
  /** A pessoa ja abriu o link desta vaga (acao `applied`). */
  isOpened: boolean
  likePending?: boolean
  isAuthenticated: boolean
  onLike: (id: string) => void
  onApply: (id: string) => void
  onReportClosed: (id: string) => void
  onCompanyFeedback: (company: string) => void
  reportedClosed: boolean
}

export function JobCard({
  job,
  now,
  highlighted,
  isLiked,
  isOpened,
  likePending,
  isAuthenticated,
  onLike,
  onApply,
  onReportClosed,
  onCompanyFeedback,
  reportedClosed,
}: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  // Vagas de exemplo ("fj...") nao tem contrapartida no banco: curtir ou
  // reportar nelas daria 404.
  const isSample = job.id.startsWith("fj")

  const original = job.description_en?.trim() || null
  const translation = job.description?.trim() || null
  const canToggleLanguage = job.is_international && !!original && !!translation
  const description = job.is_international
    ? (showTranslation ? translation : original) ?? translation ?? original
    : translation

  const summaryRows = job.summary ? parseSummaryRows(job.summary) : []

  return (
    <article
      id={`vaga-${job.id}`}
      aria-label={`${job.title}${job.company ? ` na ${job.company}` : ""}`}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-card p-4 transition-colors sm:p-5",
        highlighted
          ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-primary/30",
      )}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug text-foreground">
            {/* Titulo leva a pagina da vaga: e la que mora a descricao inteira
                e o structured data que o Google Jobs le. O card continua com o
                botao direto para a origem, para quem ja decidiu. */}
            <Link
              href={`/jobs/${job.id}`}
              className="rounded underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {job.title}
            </Link>
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {job.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {formatJobActiveHours(
                getJobActiveHours(job.source_posted_at || job.created_at, now),
              )}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              JOB_TYPE_CLASSES[job.job_type],
            )}
          >
            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {getJobLevelLabel(job.level)}
          </span>
          {job.area_specialty && (
            <span className="rounded-full bg-job-area-bg px-2.5 py-1 text-xs font-medium text-job-area">
              {getAreaSpecialtyLabel(job.area_specialty)}
            </span>
          )}
        </div>
      </div>

      {/* Inclusao e um EIXO proprio, nao a area da vaga: por isso aparece como
          selo separado, e a vaga continua listada na area dela. */}
      {job.inclusion_tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.inclusion_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {getInclusionLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {!isSample && job.recommendation_note && (
        <p className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          <span className="mr-1.5 font-medium text-primary">Indicação:</span>
          {job.recommendation_note}
        </p>
      )}

      {job.is_international && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-job-international/40 bg-job-international-bg px-2.5 py-1 text-xs font-semibold text-job-international">
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            Internacional
          </span>
          {job.required_language && (
            <span className="inline-flex items-center gap-1 rounded-full border border-job-international/25 bg-job-international-bg px-2.5 py-1 text-xs font-medium text-job-international">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              {job.required_language}
              {job.language_level && ` · ${getLanguageLevelLabel(job.language_level)}`}
            </span>
          )}
        </div>
      )}

      {job.stack_tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.stack_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {summaryRows.length > 0 && (
        <details className="group/summary mb-3 overflow-hidden rounded-xl border border-job-highlight/20 bg-job-highlight-bg">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-job-highlight select-none [&::-webkit-details-marker]:hidden">
            Resumo da vaga
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open/summary:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <table className="w-full border-t border-job-highlight/20 text-sm">
            <tbody>
              {summaryRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 align-top last:border-0">
                  <th scope="row" className="w-2/5 px-3 py-1.5 text-left font-medium text-foreground">
                    {row.label}
                  </th>
                  <td className="px-3 py-1.5 text-muted-foreground">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {job.important_note && (
        <details className="group/note mb-3 overflow-hidden rounded-xl border border-job-warning/20 bg-job-warning-bg">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-job-warning select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Observação importante
            </span>
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open/note:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-job-warning/20 px-3 py-2">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.important_note}
            </p>
          </div>
        </details>
      )}

      {description && (
        <>
          {canToggleLanguage && (
            <div className="mb-2 inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setShowTranslation(false)}
                aria-pressed={!showTranslation}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                  !showTranslation
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                Original (EN)
              </button>
              <button
                type="button"
                onClick={() => setShowTranslation(true)}
                aria-pressed={showTranslation}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                  showTranslation
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                Ver tradução (PT)
              </button>
            </div>
          )}

          <p
            className={cn(
              "mb-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground",
              !expanded && "line-clamp-3",
            )}
          >
            {description}
          </p>

          {description.length > 150 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mb-3 min-h-9 text-sm font-medium text-primary hover:underline"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isSample && (
            <button
              type="button"
              onClick={() => onLike(job.id)}
              disabled={likePending}
              aria-pressed={isLiked}
              aria-label={isLiked ? "Remover curtida" : "Curtir vaga"}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                isLiked
                  ? "bg-job-like-bg text-job-like"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} aria-hidden="true" />
              {job.like_count ?? 0}
            </button>
          )}
          {job.salary_range && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              {job.salary_range}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/jobs/${job.id}`}
            title={job.company ? `${job.title} na ${job.company}` : job.title}
            text="Veja esta vaga compartilhada na comunidade de mentorados."
            label="Compartilhe com alguém"
            labelVisibility="desktop"
            variant="ghost"
            size="sm"
            tracking={{ type: "job", id: job.id }}
            className="min-h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
          />

          {job.application_url && (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onApply(job.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // Vaga ja aberta fica visivelmente diferente: ao voltar de
                // outra aba, a pessoa precisa saber onde parou. Antes nada
                // mudava e dava para reabrir a mesma vaga varias vezes.
                isOpened
                  ? "border border-primary/40 bg-primary/10 text-primary"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {isOpened ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              )}
              {isOpened ? "Você já abriu" : "Ver vaga"}
            </a>
          )}
        </div>
      </div>

      {!isSample && job.posted_by_name && (
        <p className="mt-3 text-xs text-muted-foreground">
          Publicado por {job.posted_by_name}
        </p>
      )}

      {isAuthenticated && !isSample && (
        <div
          className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4"
          role="region"
          aria-label="Colabore com a comunidade"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Algo errado com esta vaga?
            </p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Seu relato protege outros mentorados de experiências ruins. Leva 2 segundos.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onReportClosed(job.id)}
              disabled={reportedClosed}
              aria-pressed={reportedClosed}
              className={cn(
                "group inline-flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                reportedClosed
                  ? "cursor-default border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-destructive/30 bg-card text-foreground shadow-sm hover:border-destructive/60 hover:bg-destructive/10 active:scale-[0.98]",
              )}
            >
              <XCircle className="h-5 w-5" aria-hidden="true" />
              {reportedClosed ? "Reportado — obrigado!" : "Vaga encerrada"}
            </button>
            {job.company && (
              <button
                type="button"
                onClick={() => onCompanyFeedback(job.company as string)}
                aria-label={`Dar feedback sobre a empresa ${job.company}`}
                className="group inline-flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-xl border-2 border-job-warning/30 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-job-warning/60 hover:bg-job-warning-bg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Flag className="h-5 w-5 text-job-warning" aria-hidden="true" />
                Feedback da empresa
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

