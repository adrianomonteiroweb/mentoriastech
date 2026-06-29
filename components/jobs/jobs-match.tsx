"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
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
  level: "internship" | "junior" | "mid" | "senior";
  category: JobCategory;
  salary_range: string | null;
  application_url: string | null;
  is_international: boolean;
  required_language: string | null;
  language_level: "basic" | "intermediate" | "advanced" | "fluent" | null;
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
  internship: "Estágio",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
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

  const description =
    (job.is_international
      ? job.description_en?.trim() || job.description?.trim()
      : job.description?.trim()) || null;
  const liked = isLiked(job.id);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs font-medium text-muted-foreground">
        Vaga {index + 1} de {jobs.length}
      </p>

      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5">
        {/* Área "foto" — informações importantes da vaga */}
        <div className="flex flex-col gap-2.5 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
          <div className="flex flex-wrap items-center gap-2">
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

          <h2 className="text-lg font-semibold leading-snug text-foreground">
            {job.title}
          </h2>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {job.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0" />
                {job.company}
              </span>
            )}
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

        {/* Conteúdo rolável */}
        <div className="flex max-h-[28vh] flex-col gap-3 overflow-y-auto p-4 sm:max-h-[40vh] sm:p-5">
          {job.recommendation_note && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Por que indicaram esta vaga
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {job.recommendation_note}
              </p>
            </div>
          )}

          {job.is_international && job.important_note && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Observação importante
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {job.important_note}
              </p>
            </div>
          )}

          {job.stack_tags && job.stack_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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

          {description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Botões de ação estilo Tinder */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleHide}
          aria-label="Deixar de exibir esta vaga"
          title="Deixar de exibir esta vaga"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          aria-label={liked ? "Salva (remover)" : "Salvar vaga"}
          title={liked ? "Salva — clique para curtir novamente" : "Salvar vaga"}
          className={cn(
            "inline-flex h-16 w-16 items-center justify-center rounded-full border shadow-sm transition-colors",
            liked
              ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
              : "border-border bg-card text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10",
          )}
        >
          <Heart className={cn("h-7 w-7", liked && "fill-current")} />
        </button>

        {job.application_url ? (
          <a
            href={job.application_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleApply}
            aria-label="Candidatar-se"
            title="Candidatar-se"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-6 w-6" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Sem link de candidatura"
            title="Sem link de candidatura"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground/40"
          >
            <ExternalLink className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <X className="h-3.5 w-3.5" /> Esconder
        </span>
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" /> Salvar
        </span>
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="h-3.5 w-3.5" /> Candidatar-se
        </span>
      </div>
    </div>
  );
}
