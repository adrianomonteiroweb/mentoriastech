"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  CalendarDays,
  Heart,
  Layers,
  List,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react"
import { AdBanner } from "@/components/ad-banner"
import { DonateWidget } from "@/components/donate-widget"
import { CompanyFeedbackDialog } from "@/components/jobs/company-feedback-dialog"
import { JobShareForm } from "@/components/jobs/job-share-form"
import { JobsMatch } from "@/components/jobs/jobs-match"
import { PageViewTracker } from "@/components/page-view-tracker"
import { RandomTipCard } from "@/components/random-tip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { cn } from "@/lib/utils"
import type { JobFacets, JobListItem } from "@/lib/db/job-listing"
import type { JobListQuery, JobSort } from "@/lib/job-list-query"
import { AppliedFilters } from "./applied-filters"
import { EmptyState } from "./empty-state"
import { FilterSheet } from "./filter-sheet"
import { JobCard } from "./job-card"
import { JobSkeletonList } from "./job-skeleton"
import { useJobFilters } from "./use-job-filters"

// -----------------------------------------------------------------------------
// Portal de vagas — orquestrador do cliente.
//
// Recebe a PRIMEIRA pagina ja renderizada pelo servidor e cuida do que so o
// cliente pode fazer: rolar infinito, curtir, esconder, reportar e o modo
// match. Os filtros moram na URL (useJobFilters) — quando mudam, o servidor
// re-renderiza e manda uma primeira pagina nova.
//
// Este componente e remontado por `key` quando a busca muda (ver page.tsx), o
// que zera as paginas acumuladas. Sem isso, trocar de filtro deixaria as vagas
// do filtro anterior na tela misturadas com as novas.
// -----------------------------------------------------------------------------

const SORT_OPTIONS: { key: JobSort; label: string }[] = [
  { key: "relevant", label: "Mais relevantes" },
  { key: "recent", label: "Mais recentes" },
  { key: "popular", label: "Mais curtidas" },
]

type UserAction = { job_id: string; action_type: string }

type Props = {
  query: JobListQuery
  facets: JobFacets
  initialJobs: JobListItem[]
  initialCursor: string | null
  initialActions: UserAction[]
  isAuthenticated: boolean
  resolvedSort: JobSort
  /** Query string da busca atual, para pedir a proxima pagina. */
  searchQS: string
}

function trackJobEvent(jobId: string, event: "view" | "click") {
  fetch(`/api/jobs/${jobId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {})
}

export function JobsPortal({
  query,
  facets,
  initialJobs,
  initialCursor,
  initialActions,
  isAuthenticated,
  resolvedSort,
  searchQS,
}: Props) {
  const filters = useJobFilters(query)
  const { hydrated, preferences, updatePreference } = useUserPreferences()

  const [jobs, setJobs] = useState(initialJobs)
  const [cursor, setCursor] = useState(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actions, setActions] = useState(initialActions)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(query.q ?? "")
  const [shareOpen, setShareOpen] = useState(false)
  const [feedbackCompany, setFeedbackCompany] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [targetJobId, setTargetJobId] = useState<string | null>(null)

  const sentinel = useRef<HTMLDivElement | null>(null)
  const viewed = useRef<Set<string>>(new Set())

  const viewMode = preferences.jobsViewMode
  const hiddenIds = useMemo(
    () => new Set(preferences.hiddenJobIds),
    [preferences.hiddenJobIds],
  )

  const visibleJobs = useMemo(
    () => jobs.filter((job) => !hiddenIds.has(job.id)),
    [jobs, hiddenIds],
  )

  // "ha X horas" precisa continuar correto numa aba aberta o dia todo.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Deep link #vaga-<id>: rola ate a vaga e a destaca.
  useEffect(() => {
    function sync() {
      const hash = window.location.hash
      setTargetJobId(
        hash.startsWith("#vaga-") ? decodeURIComponent(hash.slice(6)) : null,
      )
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  useEffect(() => {
    if (!targetJobId) return
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`vaga-${targetJobId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [targetJobId, jobs.length])

  useEffect(() => {
    for (const job of jobs) {
      if (job.id.startsWith("fj") || viewed.current.has(job.id)) continue
      viewed.current.add(job.id)
      trackJobEvent(job.id, "view")
    }
  }, [jobs])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams(searchQS)
      params.set("cursor", cursor)

      const res = await fetch(`/api/jobs?${params.toString()}`)
      const json = await res.json()

      setJobs((prev) => {
        // Dedup por id: se uma vaga entrar no topo entre duas paginas, o
        // keyset ja evita repeticao, mas a rede pode reentregar a mesma pagina
        // (retry, voltar/avancar) e um id repetido quebraria o React.
        const seen = new Set(prev.map((j) => j.id))
        const novas = ((json.data ?? []) as JobListItem[]).filter((j) => !seen.has(j.id))
        return [...prev, ...novas]
      })
      setActions((prev) => [...prev, ...((json.user_actions ?? []) as UserAction[])])
      setCursor((json.next_cursor as string | null) ?? null)
    } catch {
      // Falha de rede nao limpa a lista: mantem o que ja esta na tela e deixa
      // o botao disponivel para tentar de novo.
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, searchQS])

  // Rolagem infinita. rootMargin alto carrega ANTES de chegar ao fim, entao em
  // 4G a proxima pagina costuma estar pronta quando a pessoa alcanca o fim.
  useEffect(() => {
    const node = sentinel.current
    if (!node || !cursor) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "600px 0px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, loadMore])

  function hasAction(jobId: string, type: string) {
    return actions.some((a) => a.job_id === jobId && a.action_type === type)
  }

  async function toggleAction(jobId: string, actionType: string) {
    const key = `${jobId}:${actionType}`
    setActionPending(key)
    const wasActive = hasAction(jobId, actionType)

    try {
      const res = wasActive
        ? await fetch(`/api/jobs/${jobId}/actions?action_type=${actionType}`, {
            method: "DELETE",
          })
        : await fetch(`/api/jobs/${jobId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action_type: actionType }),
          })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setActions((prev) =>
        wasActive
          ? prev.filter((a) => !(a.job_id === jobId && a.action_type === actionType))
          : [...prev, { job_id: jobId, action_type: actionType }],
      )

      if (typeof json.like_count === "number") {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, like_count: Math.max(0, json.like_count) } : j,
          ),
        )
      }
      if (json.deactivated) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
      }
    } catch {
      // silencioso: a acao e secundaria e nao vale um alerta na cara
    } finally {
      setActionPending(null)
    }
  }

  function handleApply(jobId: string) {
    trackJobEvent(jobId, "click")
    // Marca "ja abri esta" para quem volta da outra aba saber onde parou.
    if (isAuthenticated && !hasAction(jobId, "applied")) {
      toggleAction(jobId, "applied")
    }
  }

  function hideJob(jobId: string) {
    if (preferences.hiddenJobIds.includes(jobId)) return
    updatePreference("hiddenJobIds", [...preferences.hiddenJobIds, jobId])
  }

  function submitSearch(term: string) {
    filters.set("q", term.trim() || null)
  }

  const hasFilters = filters.activeCount > 0 || !!query.q
  const total = facets.total

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-16 pt-5 sm:px-6">
      <PageViewTracker path="/jobs" />

      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Portal de Vagas Tech
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Vagas em tecnologia curadas pela comunidade · atualizadas diariamente
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              timeZone: "America/Sao_Paulo",
            })}
          </span>
          {facets.today > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-primary">
                {facets.today} {facets.today === 1 ? "nova hoje" : "novas hoje"}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <Link
            href="/jobs/insights"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Radar
          </Link>
        </div>
      </header>

      {/* Busca + filtros. Duas linhas no maximo: o resto mora no bottom sheet,
          para a primeira dobra do celular mostrar VAGA, nao controle. */}
      <div className="flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitSearch(searchTerm)
          }}
          className="relative"
          role="search"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => submitSearch(searchTerm)}
            placeholder="Cargo, empresa ou tecnologia…"
            aria-label="Buscar vagas"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                submitSearch("")
              }}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <FilterSheet
            query={query}
            facets={facets}
            activeCount={filters.activeCount}
            isActive={filters.isActive}
            onToggle={filters.toggle}
            onSet={filters.set}
            onClearAll={filters.clearAll}
          />

          {/* Atalhos do que mais se usa, sem abrir o painel. */}
          {[
            { key: "br" as const, label: "Brasil" },
            { key: "world" as const, label: "Mundo" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                filters.set("scope", query.scope === opt.key ? null : opt.key)
              }
              aria-pressed={query.scope === opt.key}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                query.scope === opt.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {opt.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => filters.set("posted", query.posted === "today" ? null : "today")}
            aria-pressed={query.posted === "today"}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              query.posted === "today"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Hoje
          </button>
        </div>

        <AppliedFilters
          query={query}
          onToggle={filters.toggle}
          onClear={filters.clear}
          onClearAll={filters.clearAll}
        />
      </div>

      {/* Contagem + ordenacao. O numero vem das facetas, ou seja e o total REAL
          da busca, nao "quantas eu ja rolei". */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filters.isPending ? (
            "Atualizando…"
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {total.toLocaleString("pt-BR")}
              </span>{" "}
              {total === 1 ? "vaga" : "vagas"}
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="job-sort" className="sr-only">
            Ordenar vagas
          </label>
          <select
            id="job-sort"
            value={resolvedSort}
            onChange={(e) => filters.set("sort", e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.filter((o) => o.key !== "relevant" || query.q).map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {hydrated && (
            <div
              className="inline-flex rounded-lg border border-border bg-card p-0.5"
              role="group"
              aria-label="Modo de visualização"
            >
              <button
                type="button"
                onClick={() => updatePreference("jobsViewMode", "list")}
                aria-label="Ver em lista"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md px-2 py-1 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => updatePreference("jobsViewMode", "match")}
                aria-label="Ver em match"
                aria-pressed={viewMode === "match"}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md px-2 py-1 transition-colors",
                  viewMode === "match"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Indicar vaga
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Indicar vaga
          </Link>
        )}

        {preferences.hiddenJobIds.length > 0 && (
          <button
            type="button"
            onClick={() => updatePreference("hiddenJobIds", [])}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Restaurar ocultas ({preferences.hiddenJobIds.length})
          </button>
        )}
      </div>

      {viewMode === "list" && <AdBanner />}
      {viewMode === "list" && preferences.showTips && <RandomTipCard placement="jobs" />}

      <div
        id="vagas"
        className={cn(
          "scroll-mt-6 flex flex-col gap-3 transition-opacity",
          // Esmaece em vez de esvaziar: trocar de filtro nao pode piscar a
          // tela em branco, senao a pessoa perde a referencia de onde estava.
          filters.isPending && "pointer-events-none opacity-50",
        )}
      >
        {viewMode === "match" ? (
          <JobsMatch
            jobs={visibleJobs}
            isLiked={(id) => hasAction(id, "liked")}
            onLike={(id) => toggleAction(id, "liked")}
            onHide={hideJob}
            onApply={handleApply}
            onSwitchToList={() => updatePreference("jobsViewMode", "list")}
          />
        ) : visibleJobs.length === 0 ? (
          <EmptyState
            query={query}
            hasFilters={hasFilters}
            onRelax={(key) => {
              if (key === "q") setSearchTerm("")
              filters.clear(key)
            }}
            onClearAll={() => {
              setSearchTerm("")
              filters.clearAll()
            }}
          />
        ) : (
          visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              now={now}
              highlighted={targetJobId === job.id}
              isLiked={hasAction(job.id, "liked")}
              isOpened={hasAction(job.id, "applied")}
              likePending={actionPending === `${job.id}:liked`}
              isAuthenticated={isAuthenticated}
              onLike={(id) => toggleAction(id, "liked")}
              onApply={handleApply}
              onReportClosed={(id) => toggleAction(id, "closed")}
              onCompanyFeedback={setFeedbackCompany}
              reportedClosed={hasAction(job.id, "closed")}
            />
          ))
        )}

        {viewMode === "list" && cursor && (
          <div ref={sentinel} className="py-2">
            {loadingMore ? (
              <JobSkeletonList count={2} />
            ) : (
              <button
                type="button"
                onClick={loadMore}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              >
                Carregar mais vagas
              </button>
            )}
          </div>
        )}

        {viewMode === "list" && !cursor && visibleJobs.length > 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Você chegou ao fim — {visibleJobs.length.toLocaleString("pt-BR")}{" "}
            {visibleJobs.length === 1 ? "vaga" : "vagas"} nesta busca.
          </p>
        )}

        {loadingMore && !cursor && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        )}
      </div>

      {viewMode === "list" && <DonateWidget />}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Indicar uma vaga</DialogTitle>
            <DialogDescription>
              Compartilhe o link de uma vaga interessante com a comunidade. Após a
              aprovação, ela aparece aqui no quadro.
            </DialogDescription>
          </DialogHeader>
          <JobShareForm onSuccess={() => setShareOpen(false)} />
        </DialogContent>
      </Dialog>

      {feedbackCompany && (
        <CompanyFeedbackDialog
          open={!!feedbackCompany}
          onOpenChange={(open) => {
            if (!open) setFeedbackCompany(null)
          }}
          company={feedbackCompany}
        />
      )}
    </main>
  )
}
