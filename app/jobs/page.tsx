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
  ChevronDown,
  List,
  Layers,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { AdBanner } from "@/components/ad-banner";
import { DonateWidget } from "@/components/donate-widget";
import { JobShareForm } from "@/components/jobs/job-share-form";
import { JobsMatch } from "@/components/jobs/jobs-match";
import { RandomTipCard } from "@/components/random-tip";
import { ShareButton } from "@/components/share-button";
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

function parseSummaryRows(summary: string): { label: string; value: string }[] {
  return summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const sep = tab >= 0 ? tab : line.indexOf(":");
      if (sep === -1) return { label: line, value: "" };
      return {
        label: line.slice(0, sep).trim(),
        value: line.slice(sep + 1).trim(),
      };
    })
    // Ignora um eventual cabeçalho "Item / Detalhes" colado junto.
    .filter(
      (row) =>
        !(
          row.label.toLowerCase() === "item" &&
          row.value.toLowerCase() === "detalhes"
        ),
    );
}

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
  const [onlySaved, setOnlySaved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [translatedJobs, setTranslatedJobs] = useState<Set<string>>(new Set());
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
        setOnlySaved(false);
        updatePreference("jobsViewMode", "list");
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

  function setLikeCount(jobId: string, likeCount: number) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, like_count: Math.max(0, likeCount) } : j,
      ),
    );
  }

  async function toggleAction(jobId: string, actionType: string) {
    const key = `${jobId}:${actionType}`;
    setActionLoading(key);
    const wasActive = hasAction(jobId, actionType);
    try {
      if (wasActive) {
        const res = await fetch(
          `/api/jobs/${jobId}/actions?action_type=${actionType}`,
          { method: "DELETE" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao remover acao");

        setUserActions((prev) =>
          prev.filter(
            (a) => !(a.job_id === jobId && a.action_type === actionType),
          ),
        );
        if (actionType === "liked" && typeof json.like_count === "number") {
          setLikeCount(jobId, json.like_count);
        }
      } else {
        const res = await fetch(`/api/jobs/${jobId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action_type: actionType }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao registrar acao");

        setUserActions((prev) => [
          ...prev,
          { job_id: jobId, action_type: actionType },
        ]);
        if (actionType === "liked" && typeof json.like_count === "number") {
          setLikeCount(jobId, json.like_count);
        }
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
    toggleAction(jobId, "liked");
  }

  function toggleTranslation(jobId: string) {
    setTranslatedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }

  const hiddenJobIds = useMemo(
    () => new Set(preferences.hiddenJobIds),
    [preferences.hiddenJobIds],
  );

  function hideJob(jobId: string) {
    if (preferences.hiddenJobIds.includes(jobId)) return;
    updatePreference("hiddenJobIds", [...preferences.hiddenJobIds, jobId]);
  }

  function restoreHiddenJobs() {
    updatePreference("hiddenJobIds", []);
  }

  function setViewMode(mode: "list" | "match") {
    updatePreference("jobsViewMode", mode);
  }

  function resetFilters() {
    setActiveTab("all");
    setActiveType("all");
    setActiveScope("all");
    setActiveCategory("all");
    setOnlySaved(false);
  }

  function toggleJobFilters() {
    const nextValue = !preferences.showJobFilters;

    updatePreference("showJobFilters", nextValue);

    if (!nextValue) {
      resetFilters();
    }
  }

  const filtered = jobs.filter((job) => {
    if (hiddenJobIds.has(job.id)) return false;
    if (onlySaved && !hasAction(job.id, "liked")) return false;
    if (activeTab !== "all" && job.level !== activeTab) return false;
    if (activeType !== "all" && job.job_type !== activeType) return false;
    if (activeScope === "national" && job.is_international) return false;
    if (activeScope === "international" && !job.is_international) return false;
    if (activeCategory !== "all" && job.category !== activeCategory)
      return false;
    return true;
  });

  const viewMode = preferences.jobsViewMode;
  const hiddenCount = preferences.hiddenJobIds.length;

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Carregando vagas</span>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6 sm:px-6 md:py-12">
      <div
        className={cn(
          "flex w-full max-w-3xl flex-col",
          viewMode === "match" ? "gap-4" : "gap-6",
        )}
      >
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
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                Curadoria de Vagas
              </h1>
              {viewMode === "list" && (
                <p className="hidden text-sm leading-relaxed text-muted-foreground sm:block">
                  Vagas compartilhadas para a comunidade de mentorados.
                </p>
              )}
            </div>
          </div>
        </div>

        {hydrated && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm font-medium"
              role="group"
              aria-label="Modo de visualização"
            >
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("match")}
                aria-pressed={viewMode === "match"}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  viewMode === "match"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="h-4 w-4" />
                Match
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  title="Indicar vaga"
                  aria-label="Indicar vaga"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Indicar</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  title="Indicar vaga"
                  aria-label="Indicar vaga"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Indicar</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOnlySaved((prev) => !prev)}
                aria-pressed={onlySaved}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  onlySaved
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                <Heart className={cn("h-4 w-4", onlySaved && "fill-current")} />
                Salvas
              </button>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={restoreHiddenJobs}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  title="Mostrar novamente as vagas que você escondeu"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restaurar escondidas ({hiddenCount})
                </button>
              )}
            </div>
          </div>
        )}

        {viewMode === "list" && <AdBanner />}

        {hydrated && viewMode === "list" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleJobFilters}
              aria-expanded={preferences.showJobFilters}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                preferences.showJobFilters
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {preferences.showJobFilters ? "Ocultar filtros" : "Filtrar"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  preferences.showJobFilters && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => updatePreference("showTips", !preferences.showTips)}
              aria-pressed={preferences.showTips}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                preferences.showTips
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <Lightbulb className="h-4 w-4" />
              {preferences.showTips ? "Ocultar dicas" : "Dicas"}
            </button>
          </div>
        )}

        {hydrated && viewMode === "list" && preferences.showJobFilters && (
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

        {viewMode === "list" && preferences.showTips && (
          <RandomTipCard placement="jobs" />
        )}

        <div id="vagas" className="scroll-mt-6 flex flex-col gap-3">
          {viewMode === "match" ? (
            <JobsMatch
              jobs={filtered}
              isLiked={(id) => hasAction(id, "liked")}
              onLike={(id) => toggleAction(id, "liked")}
              onHide={hideJob}
              onApply={(id) => trackJobEvent(id, "click")}
              onSwitchToList={() => setViewMode("list")}
            />
          ) : (
            <>
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
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-300">
                    <Globe className="h-3.5 w-3.5" />
                    Internacional
                  </span>
                  {job.required_language && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:border-transparent dark:bg-violet-400/15 dark:text-violet-300">
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

              {job.stack_tags && job.stack_tags.length > 0 && (
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

              {/* Resumo da vaga (internacional) */}
              {job.is_international &&
                job.summary &&
                (() => {
                  const rows = parseSummaryRows(job.summary);
                  if (rows.length === 0) return null;
                  return (
                    <div className="mb-3 overflow-hidden rounded-lg border border-violet-500/20 bg-violet-500/5">
                      <p className="border-b border-violet-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                        Resumo da vaga
                      </p>
                      <table className="w-full text-sm">
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
                    </div>
                  );
                })()}

              {/* Observação importante (internacional) */}
              {job.is_international && job.important_note && (
                <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Observação importante
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {job.important_note}
                  </p>
                </div>
              )}

              {/* Descrição — internacional: original (EN) em destaque + tradução visível */}
              {(() => {
                const original = job.description_en?.trim() || null;
                const translation = job.description?.trim() || null;
                const canToggle =
                  job.is_international && !!original && !!translation;
                const showingTranslation = translatedJobs.has(job.id);
                const primary = job.is_international
                  ? (showingTranslation ? translation : original) ??
                    translation ??
                    original
                  : translation;
                if (!primary) return null;
                const expanded = expandedJobs.has(job.id);
                return (
                  <>
                    {canToggle && (
                      <div className="mb-2 inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() =>
                            showingTranslation && toggleTranslation(job.id)
                          }
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
                          onClick={() =>
                            !showingTranslation && toggleTranslation(job.id)
                          }
                          aria-pressed={showingTranslation}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                            showingTranslation
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Languages className="h-3.5 w-3.5" />
                          Ver tradução (PT)
                        </button>
                      </div>
                    )}
                    <p
                      className={`mb-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
                        expanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {primary}
                    </p>
                    {primary.length > 150 && (
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
                        {expanded ? "Ver menos" : "Ver mais"}
                      </button>
                    )}
                  </>
                );
              })()}

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
                        hasAction(job.id, "liked")
                          ? "Remover curtida"
                          : "Curtir vaga"
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
                      job.company ? `${job.title} na ${job.company}` : job.title
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
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Ajude a comunidade a manter as vagas atualizadas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleAction(job.id, "applied")}
                      disabled={actionLoading === `${job.id}:applied`}
                      aria-pressed={hasAction(job.id, "applied")}
                      title={
                        hasAction(job.id, "applied")
                          ? "Clique para desfazer"
                          : "Marcar que se candidatou"
                      }
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all",
                        hasAction(job.id, "applied")
                          ? "border-green-500/40 bg-green-500/15 text-green-600 dark:text-green-400"
                          : "border-border bg-card text-muted-foreground hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400",
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {hasAction(job.id, "applied")
                        ? "Candidatei-me ✓"
                        : "Me candidatei"}
                    </button>
                    <button
                      onClick={() => toggleAction(job.id, "link_issue")}
                      disabled={
                        hasAction(job.id, "link_issue") ||
                        actionLoading === `${job.id}:link_issue`
                      }
                      aria-pressed={hasAction(job.id, "link_issue")}
                      title={
                        hasAction(job.id, "link_issue")
                          ? "Já reportado — obrigado!"
                          : "O link está quebrado ou redirecionando errado?"
                      }
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all",
                        hasAction(job.id, "link_issue")
                          ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                          : "border-border bg-card text-muted-foreground hover:border-yellow-500/40 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {hasAction(job.id, "link_issue")
                        ? "Link reportado ✓"
                        : "Link com problema?"}
                    </button>
                    <button
                      onClick={() => toggleAction(job.id, "closed")}
                      disabled={
                        hasAction(job.id, "closed") ||
                        actionLoading === `${job.id}:closed`
                      }
                      aria-pressed={hasAction(job.id, "closed")}
                      title={
                        hasAction(job.id, "closed")
                          ? "Já reportado — obrigado!"
                          : "A vaga foi encerrada ou não aceita mais candidatos?"
                      }
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all",
                        hasAction(job.id, "closed")
                          ? "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400"
                          : "border-border bg-card text-muted-foreground hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400",
                      )}
                    >
                      <XCircle className="h-4 w-4" />
                      {hasAction(job.id, "closed")
                        ? "Encerramento reportado ✓"
                        : "Vaga encerrada?"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-base text-muted-foreground">
              {onlySaved
                ? "Você ainda não salvou nenhuma vaga."
                : `Nenhuma vaga disponível${activeTab !== "all" ? " neste nível" : " no momento"}.`}
            </p>
          )}
            </>
          )}
        </div>

        {viewMode === "list" && <DonateWidget />}
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
