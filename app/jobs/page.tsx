"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  Loader2,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  XCircle,
  Globe,
  Heart,
  Languages,
  Lightbulb,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { AdBanner } from "@/components/ad-banner";
import { JobShareForm } from "@/components/jobs/job-share-form";
import { RandomTipCard } from "@/components/random-tip";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  getJobCategoryLabel,
  mergeJobCategoryOptions,
} from "@/lib/job-options";
import { cn } from "@/lib/utils";
import { formatJobActiveHours, getJobActiveHours } from "@/lib/job-active-time";
import type { JobCategory } from "@/lib/types/database";

interface Job {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
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
  like_count: number;
  source_posted_at: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  remote: "bg-green-500/10 text-green-400",
  hybrid: "bg-yellow-500/10 text-yellow-400",
  onsite: "bg-blue-500/10 text-blue-400",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
};

const LEVEL_TABS = [
  { key: "all", label: "Todas" },
  { key: "internship", label: "Estágio & Trainee" },
  { key: "junior", label: "Júnior" },
  { key: "mid", label: "Pleno" },
  { key: "senior", label: "Sênior" },
] as const;

const TYPE_TABS = [
  { key: "all", label: "Todos" },
  { key: "remote", label: "Remoto" },
  { key: "hybrid", label: "Híbrido" },
  { key: "onsite", label: "Presencial" },
] as const;

const SCOPE_TABS = [
  { key: "all", label: "Todas" },
  { key: "national", label: "Nacional" },
  { key: "international", label: "Internacional" },
] as const;

function trackJobEvent(jobId: string, event: "view" | "click") {
  fetch(`/api/jobs/${jobId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {});
}

interface UserAction {
  job_id: string;
  action_type: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");
  const [activeScope, setActiveScope] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [targetJobId, setTargetJobId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { hydrated, preferences, updatePreference } = useUserPreferences();
  const viewedJobs = useRef<Set<string>>(new Set());
  const categoryTabs = useMemo(
    () => [
      { key: "all", label: "Todas" },
      ...mergeJobCategoryOptions(jobs.map((job) => job.category)).map(
        (category) => ({
          key: category.value,
          label: category.label,
        }),
      ),
    ],
    [jobs],
  );

  function loadJobs() {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((json) => {
        if (json.error || !json.data) {
          setJobs([]);
          setUserActions([]);
          setIsAuthenticated(false);
        } else {
          setJobs(json.data || []);
          setUserActions(json.user_actions || []);
          setIsAuthenticated(!!json.is_authenticated);
        }
      })
      .catch(() => {
        setJobs([]);
        setUserActions([]);
        setIsAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function syncTargetJob() {
      const hash = window.location.hash;
      const next = hash.startsWith("#vaga-")
        ? decodeURIComponent(hash.slice("#vaga-".length))
        : null;

      setTargetJobId(next);

      if (next) {
        setActiveTab("all");
        setActiveType("all");
        setActiveScope("all");
        setActiveCategory("all");
        setExpandedJobs((prev) => {
          const expanded = new Set(prev);
          expanded.add(next);
          return expanded;
        });
      }
    }

    syncTargetJob();
    window.addEventListener("hashchange", syncTargetJob);
    return () => window.removeEventListener("hashchange", syncTargetJob);
  }, []);

  // Rastrear visualização das vagas quando carregam
  useEffect(() => {
    jobs.forEach((job) => {
      if (!job.id.startsWith("fj") && !viewedJobs.current.has(job.id)) {
        viewedJobs.current.add(job.id);
        trackJobEvent(job.id, "view");
      }
    });
  }, [jobs]);

  useEffect(() => {
    if (loading || !targetJobId) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`vaga-${targetJobId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeCategory,
    activeScope,
    activeTab,
    activeType,
    jobs.length,
    loading,
    targetJobId,
  ]);

  function hasAction(jobId: string, actionType: string) {
    return userActions.some(
      (a) => a.job_id === jobId && a.action_type === actionType,
    );
  }

  function adjustLikeCount(jobId: string, delta: number) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, like_count: Math.max(0, (j.like_count ?? 0) + delta) }
          : j,
      ),
    );
  }

  async function toggleAction(jobId: string, actionType: string) {
    const key = `${jobId}:${actionType}`;
    setActionLoading(key);
    const wasActive = hasAction(jobId, actionType);
    try {
      if (wasActive) {
        await fetch(`/api/jobs/${jobId}/actions?action_type=${actionType}`, {
          method: "DELETE",
        });
        setUserActions((prev) =>
          prev.filter(
            (a) => !(a.job_id === jobId && a.action_type === actionType),
          ),
        );
        if (actionType === "liked") adjustLikeCount(jobId, -1);
      } else {
        const res = await fetch(`/api/jobs/${jobId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action_type: actionType }),
        });
        const json = await res.json();
        setUserActions((prev) => [
          ...prev,
          { job_id: jobId, action_type: actionType },
        ]);
        if (actionType === "liked") adjustLikeCount(jobId, 1);
        if (json.deactivated) {
          setJobs((prev) => prev.filter((j) => j.id !== jobId));
        }
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  function handleLike(jobId: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    toggleAction(jobId, "liked");
  }

  function resetFilters() {
    setActiveTab("all");
    setActiveType("all");
    setActiveScope("all");
    setActiveCategory("all");
  }

  function toggleJobFilters() {
    const nextValue = !preferences.showJobFilters;

    updatePreference("showJobFilters", nextValue);

    if (!nextValue) {
      resetFilters();
    }
  }

  const filtered = jobs.filter((job) => {
    if (activeTab !== "all" && job.level !== activeTab) return false;
    if (activeType !== "all" && job.job_type !== activeType) return false;
    if (activeScope === "national" && job.is_international) return false;
    if (activeScope === "international" && !job.is_international) return false;
    if (activeCategory !== "all" && job.category !== activeCategory)
      return false;
    return true;
  });

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Carregando vagas</span>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 md:py-16">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-10 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Quadro de Vagas
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Vagas compartilhadas para a comunidade de mentorados.
              </p>
            </div>
            {isAuthenticated ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="min-h-10 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Indicar vaga
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="min-h-10 shrink-0"
              >
                <Link href="/login">
                  <Plus className="h-4 w-4" />
                  Indicar vaga
                </Link>
              </Button>
            )}
          </div>
        </div>

        <AdBanner />

        {hydrated && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={toggleJobFilters}
              className="min-h-10"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {preferences.showJobFilters
                ? "Ocultar filtros"
                : "Mostrar filtros"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                updatePreference("showTips", !preferences.showTips)
              }
              className="min-h-10"
            >
              <Lightbulb className="h-4 w-4" />
              {preferences.showTips
                ? "Ocultar dicas extras"
                : "Mostrar dicas extras"}
            </Button>
          </div>
        )}

        {hydrated && preferences.showJobFilters && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-3 sm:p-4">
            <div role="group" aria-label="Filtrar por nível">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nível
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {LEVEL_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    aria-pressed={activeTab === tab.key}
                    className={`min-h-8 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm sm:px-4 ${
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div role="group" aria-label="Filtrar por modelo">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Modelo
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {TYPE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveType(tab.key)}
                      aria-pressed={activeType === tab.key}
                      className={`min-h-8 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm sm:px-4 ${
                        activeType === tab.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div role="group" aria-label="Filtrar por alcance">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Alcance
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {SCOPE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveScope(tab.key)}
                      aria-pressed={activeScope === tab.key}
                      className={`min-h-8 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm sm:px-4 ${
                        activeScope === tab.key
                          ? tab.key === "international"
                            ? "bg-violet-400 text-background"
                            : "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {tab.key === "international" && (
                        <Globe className="mr-1 inline h-3.5 w-3.5" />
                      )}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div role="group" aria-label="Filtrar por categoria">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categoria
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    aria-pressed={activeCategory === tab.key}
                    className={`min-h-8 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm sm:px-4 ${
                      activeCategory === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <RandomTipCard placement="jobs" />

        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              id={`vaga-${job.id}`}
              className={cn(
                "scroll-mt-24 rounded-lg border bg-card p-4 transition-all hover:border-primary/30",
                targetJobId === job.id
                  ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border",
              )}
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold leading-snug text-foreground">
                    {job.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {job.company && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {job.company}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatJobActiveHours(
                        getJobActiveHours(
                          job.source_posted_at || job.created_at,
                          now,
                        ),
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {job.recommendation_note && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Indicação da comunidade
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${JOB_TYPE_COLORS[job.job_type] || ""}`}
                  >
                    {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {job.level === "internship"
                      ? "Estágio"
                      : job.level === "junior"
                        ? "Júnior"
                        : job.level === "mid"
                          ? "Pleno"
                          : "Sênior"}
                  </span>
                  {job.category && job.category !== "other" && (
                    <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-xs font-medium text-orange-300">
                      {getJobCategoryLabel(job.category)}
                    </span>
                  )}
                </div>
              </div>

              {job.is_international && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-400/15 px-2.5 py-1 text-xs font-semibold text-violet-200">
                    <Globe className="h-3.5 w-3.5" />
                    Internacional
                  </span>
                  {job.required_language && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-400/15 px-2.5 py-1 text-xs font-medium text-violet-200">
                      <Languages className="h-3.5 w-3.5" />
                      {job.required_language}
                      {job.language_level &&
                        ` · ${LANGUAGE_LEVEL_LABELS[job.language_level]}`}
                    </span>
                  )}
                </div>
              )}

              {job.recommendation_note && (
                <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Por que indicaram esta vaga
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {job.recommendation_note}
                  </p>
                </div>
              )}

              {job.description && (
                <>
                  <p
                    className={`mb-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
                      expandedJobs.has(job.id) ? "" : "line-clamp-3"
                    }`}
                  >
                    {job.description}
                  </p>
                  {job.description.length > 150 && (
                    <button
                      onClick={() => {
                        setExpandedJobs((prev) => {
                          const next = new Set(prev);
                          if (next.has(job.id)) {
                            next.delete(job.id);
                          } else {
                            next.add(job.id);
                          }
                          return next;
                        });
                      }}
                      className="mb-3 min-h-9 text-sm font-medium text-primary hover:underline"
                    >
                      {expandedJobs.has(job.id) ? "Ver menos" : "Ver mais"}
                    </button>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!job.id.startsWith("fj") && (
                    <button
                      onClick={() => handleLike(job.id)}
                      disabled={actionLoading === `${job.id}:liked`}
                      aria-pressed={hasAction(job.id, "liked")}
                      aria-label={
                        hasAction(job.id, "liked")
                          ? "Remover curtida"
                          : "Curtir vaga"
                      }
                      title={
                        isAuthenticated
                          ? "Curtir para ver mais vagas assim"
                          : "Entre para curtir"
                      }
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                        hasAction(job.id, "liked")
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          hasAction(job.id, "liked") && "fill-current",
                        )}
                      />
                      {job.like_count ?? 0}
                    </button>
                  )}
                  {job.salary_range && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {job.salary_range}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ShareButton
                    path={`/jobs#vaga-${job.id}`}
                    title={
                      job.company
                        ? `${job.title} na ${job.company}`
                        : job.title
                    }
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
                      onClick={() => trackJobEvent(job.id, "click")}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Candidatar-se
                    </a>
                  )}
                </div>
              </div>

              {job.profiles?.full_name && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Publicado por {job.profiles.full_name}
                </p>
              )}

              {isAuthenticated && !job.id.startsWith("fj") && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => toggleAction(job.id, "applied")}
                    disabled={actionLoading === `${job.id}:applied`}
                    aria-pressed={hasAction(job.id, "applied")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      hasAction(job.id, "applied")
                        ? "bg-green-500/20 text-green-400"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Me candidatei
                  </button>
                  <button
                    onClick={() => toggleAction(job.id, "link_issue")}
                    disabled={
                      hasAction(job.id, "link_issue") ||
                      actionLoading === `${job.id}:link_issue`
                    }
                    aria-pressed={hasAction(job.id, "link_issue")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      hasAction(job.id, "link_issue")
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    title={
                      hasAction(job.id, "link_issue")
                        ? "Já reportado"
                        : "Reportar link com problemas"
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Link com problemas
                  </button>
                  <button
                    onClick={() => toggleAction(job.id, "closed")}
                    disabled={
                      hasAction(job.id, "closed") ||
                      actionLoading === `${job.id}:closed`
                    }
                    aria-pressed={hasAction(job.id, "closed")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      hasAction(job.id, "closed")
                        ? "bg-red-500/20 text-red-400"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    title={
                      hasAction(job.id, "closed")
                        ? "Já reportado"
                        : "Reportar que não aceita mais candidaturas"
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    Não aceita mais candidaturas
                  </button>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-base text-muted-foreground">
              Nenhuma vaga disponível
              {activeTab !== "all" ? " neste nível" : " no momento"}.
            </p>
          )}
        </div>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Indicar uma vaga</DialogTitle>
            <DialogDescription>
              Compartilhe o link de uma vaga interessante com a comunidade. Após
              a aprovação, ela aparece aqui no quadro.
            </DialogDescription>
          </DialogHeader>
          <JobShareForm onSuccess={loadJobs} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
