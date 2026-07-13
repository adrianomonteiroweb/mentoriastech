"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  DollarSign,
  ExternalLink,
  Globe,
  Heart,
  Languages,
  MapPin,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJobCategoryLabel } from "@/lib/job-options";
import { parseSummaryRows } from "@/lib/job-summary";
import { cn } from "@/lib/utils";
import type { JobCategory } from "@/lib/types/database";

export interface MatchJob {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
  description_en: string | null;
  stack_tags: string[];
  recommendation_note: string | null;
  location: string | null;
  job_type: "remote" | "hybrid" | "onsite";
  level: string;
  category: JobCategory;
  salary_range: string | null;
  application_url: string | null;
  is_international: boolean;
  required_language: string | null;
  language_level: string | null;
  summary: string | null;
  important_note: string | null;
  like_count: number;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

const LEVEL_LABELS: Record<string, string> = {
  internship: "Estágio & Trainee",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  staff: "Staff",
  senior_staff: "Senior Staff",
  principal: "Principal",
  distinguished: "Distinguished",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
};

interface JobsMatchProps {
  jobs: MatchJob[];
  isLiked: (id: string) => boolean;
  onLike: (id: string) => void | Promise<void>;
  onHide: (id: string) => void;
  onApply: (id: string) => void;
  onSwitchToList: () => void;
}

export function JobsMatch({
  jobs,
  isLiked,
  onLike,
  onHide,
  onApply,
  onSwitchToList,
}: JobsMatchProps) {
  const [index, setIndex] = useState(0);
  const [translatedJobs, setTranslatedJobs] = useState<Set<string>>(new Set());

  // Se o baralho encolher (ex.: vaga escondida pela lista), garante índice válido.
  useEffect(() => {
    if (index > jobs.length) setIndex(jobs.length);
  }, [jobs.length, index]);

  const job = jobs[index];

  function advance() {
    setIndex((prev) => prev + 1);
  }

  function handleHide() {
    if (!job) return;
    onHide(job.id);
    // A vaga sai do array `jobs` (filtrada pelo pai), então o card atual
    // passa a ser o próximo automaticamente — não incrementamos o índice.
  }

  function handleLike() {
    if (!job) return;
    onLike(job.id);
    advance();
  }

  function handleApply() {
    if (!job) return;
    onApply(job.id);
    advance();
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-4 py-12 text-center">
        <p className="text-base text-muted-foreground">
          Nenhuma vaga disponível no momento.
        </p>
        <Button variant="outline" onClick={onSwitchToList}>
          Ver em lista
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-4 py-12 text-center">
        <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground">
            Você viu todas as vagas!
          </p>
          <p className="text-sm text-muted-foreground">
            Volte mais tarde para novas oportunidades ou revise as anteriores.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => setIndex(0)}>
            <RotateCcw className="h-4 w-4" />
            Recomeçar
          </Button>
          <Button variant="ghost" onClick={onSwitchToList}>
            Ver em lista
          </Button>
        </div>
      </div>
    );
  }

  const original = job.is_international ? job.description_en?.trim() || null : null;
  const translation = job.description?.trim() || null;
  const canToggle = job.is_international && !!original && !!translation;
  const showingTranslation = translatedJobs.has(job.id);
  const description = job.is_international
    ? (showingTranslation ? translation : original) ?? translation ?? original
    : translation;
  const liked = isLiked(job.id);

  return (
    <div className="flex flex-col items-center gap-3 pb-28 sm:gap-4 sm:pb-0">
      <p className="text-xs font-medium text-muted-foreground">
        Vaga {index + 1} de {jobs.length}
      </p>

      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5">
        <div className="flex flex-col gap-2 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-3 sm:gap-2.5 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {LEVEL_LABELS[job.level]}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {JOB_TYPE_LABELS[job.job_type] || job.job_type}
            </span>
            {job.category && job.category !== "other" && (
              <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-xs font-medium text-orange-300">
                {getJobCategoryLabel(job.category)}
              </span>
            )}
            {job.is_international && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-400/15 px-2.5 py-1 text-xs font-semibold text-violet-300">
                <Globe className="h-3.5 w-3.5" />
                Internacional
              </span>
            )}
          </div>

          <h2 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
            {job.title}
          </h2>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:gap-1.5">
            {job.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0" />
                {job.company}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {job.location}
                </span>
              )}
              {job.salary_range && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  {job.salary_range}
                </span>
              )}
              {job.is_international && job.required_language && (
                <span className="flex items-center gap-1.5">
                  <Languages className="h-4 w-4 shrink-0" />
                  {job.required_language}
                  {job.language_level &&
                    ` · ${LANGUAGE_LEVEL_LABELS[job.language_level]}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto p-3 sm:max-h-[40vh] sm:p-4">
            {job.summary &&
              (() => {
                const rows = parseSummaryRows(job.summary);
                if (rows.length === 0) return null;
                return (
                  <details className="group/summary shrink-0 overflow-hidden rounded-lg border border-violet-500/20 bg-violet-500/5">
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-600 select-none dark:text-violet-300 [&::-webkit-details-marker]:hidden">
                      Resumo da vaga
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/summary:rotate-180" aria-hidden="true" />
                    </summary>
                    <table className="w-full border-t border-violet-500/20 text-sm">
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 align-top last:border-0"
                          >
                            <th
                              scope="row"
                              className="w-2/5 px-3 py-1.5 text-left font-medium text-foreground"
                            >
                              {row.label}
                            </th>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                );
              })()}

            {job.important_note && (
              <details className="group/note shrink-0 overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-amber-600 select-none dark:text-amber-300 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Observação importante
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/note:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-amber-500/20 px-3 py-2">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {job.important_note}
                  </p>
                </div>
              </details>
            )}

            {job.stack_tags && job.stack_tags.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-1.5">
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

            {canToggle && (
              <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => showingTranslation && setTranslatedJobs((prev) => { const next = new Set(prev); next.delete(job.id); return next; })}
                  aria-pressed={!showingTranslation}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                    !showingTranslation
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Original (EN)
                </button>
                <button
                  type="button"
                  onClick={() => !showingTranslation && setTranslatedJobs((prev) => { const next = new Set(prev); next.add(job.id); return next; })}
                  aria-pressed={showingTranslation}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                    showingTranslation
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Languages className="h-3.5 w-3.5" />
                  Tradução (PT)
                </button>
              </div>
            )}

            {description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" aria-hidden="true" />
        </div>
      </div>

      {/* Ações — fixo no rodapé (mobile), inline (desktop) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm sm:static sm:inset-auto sm:z-auto sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
        <div className="flex items-center justify-center gap-4 px-4 pb-2 pt-3 sm:px-0 sm:pb-0 sm:pt-0">
          <button
            type="button"
            onClick={handleHide}
            aria-label="Esconder vaga"
            title="Esconder vaga"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 sm:h-14 sm:w-14"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={handleLike}
            aria-pressed={liked}
            aria-label={liked ? "Salva (remover)" : "Salvar vaga"}
            title={liked ? "Salva — clique para curtir novamente" : "Salvar vaga"}
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-full border shadow-sm transition-colors sm:h-16 sm:w-16",
              liked
                ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                : "border-border bg-card text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10",
            )}
          >
            <Heart className={cn("h-6 w-6 sm:h-7 sm:w-7", liked && "fill-current")} />
          </button>

          {job.application_url ? (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleApply}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:h-14 sm:px-6 sm:text-base"
            >
              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
              Candidatar-se
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Sem link de candidatura"
              title="Sem link de candidatura"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-muted-foreground/40 sm:h-14 sm:px-6 sm:text-base"
            >
              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
              Candidatar-se
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pb-3 text-[10px] text-muted-foreground sm:pb-0 sm:pt-2 sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Esconder
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Salvar
          </span>
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Candidatar-se
          </span>
        </div>
      </div>
    </div>
  );
}
