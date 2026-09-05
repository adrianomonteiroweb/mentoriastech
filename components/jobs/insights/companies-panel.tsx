"use client"

import { useCallback, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "./format"

export type CompanyRow = {
  id: string
  name: string
  slug: string
  linkedin_url: string | null
  job_count: number
  top_level: string | null
  stacks: { key: string; label: string }[]
}

type CompanyProfile = {
  id: string
  name: string
  linkedin_url: string | null
  job_count: number
  stacks: { key: string; label: string; job_count: number }[]
  levels: { level: string; count: number }[]
  locations: { label: string; country_code: string | null; count: number }[]
  recent_jobs: { id: string; title: string; created_at: string }[]
}

const LEVEL_LABELS: Record<string, string> = {
  internship: "Estágio",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  staff: "Staff",
  senior_staff: "Senior Staff",
  principal: "Principal",
  distinguished: "Distinguished",
}

/**
 * Ranking de empresas contratantes. Clicar abre o perfil da empresa — é ali
 * que a relação empresa ↔ stacks fica visível de verdade: no ranking cabem 4
 * chips, no perfil vem a lista completa com a frequência de cada tecnologia.
 *
 * O ranking respeita o período escolhido na página; o perfil é histórico
 * completo (são perguntas diferentes: "quem está contratando agora" vs. "com o
 * que essa empresa trabalha").
 */
export function CompaniesPanel({ companies }: { companies: CompanyRow[] }) {
  const [selected, setSelected] = useState<CompanyRow | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openCompany = useCallback(async (company: CompanyRow) => {
    setSelected(company)
    setProfile(null)
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/companies/${company.id}`)
      if (!response.ok) throw new Error("falha ao carregar")
      const json = await response.json()
      setProfile(json.data)
    } catch {
      setError("Não foi possível carregar o perfil desta empresa agora.")
    } finally {
      setLoading(false)
    }
  }, [])

  const maxStack = profile?.stacks[0]?.job_count ?? 1

  return (
    <>
      <ul className="divide-y divide-border">
        {companies.map((company) => (
          <li key={company.id}>
            <button
              type="button"
              onClick={() => openCompany(company)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{company.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {company.stacks.slice(0, 4).map((stack) => (
                    <Badge key={stack.key} variant="secondary" className="text-[11px]">
                      {stack.label}
                    </Badge>
                  ))}
                  {company.stacks.length > 4 ? (
                    <span className="text-[11px] text-muted-foreground">
                      +{company.stacks.length - 4}
                    </span>
                  ) : null}
                  {company.stacks.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      stacks não identificadas
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatNumber(company.job_count)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {company.job_count === 1 ? "vaga" : "vagas"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>
              {profile
                ? `${formatNumber(profile.job_count)} ${
                    profile.job_count === 1 ? "vaga aprovada" : "vagas aprovadas"
                  } na curadoria — histórico completo.`
                : "Carregando o perfil da empresa…"}
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="mt-6 space-y-3" aria-live="polite">
              <span className="sr-only">Carregando</span>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : null}

          {error ? (
            <p className="mt-6 text-sm text-muted-foreground">{error}</p>
          ) : null}

          {profile ? (
            <div className="mt-6 space-y-6">
              {profile.linkedin_url ? (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                >
                  Página no LinkedIn
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}

              <section>
                <h3 className="mb-2 text-sm font-semibold">Stacks que a empresa pede</h3>
                {profile.stacks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma stack foi identificada nas descrições das vagas desta
                    empresa.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {profile.stacks.map((stack, index) => (
                      <li
                        key={stack.key}
                        className="relative flex items-center gap-2 rounded-md px-2 py-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 rounded-md ${
                            index === 0 ? "bg-chart-1/20" : "bg-muted"
                          }`}
                          style={{
                            width: `${Math.max((stack.job_count / maxStack) * 100, 3)}%`,
                          }}
                        />
                        <span className="relative min-w-0 flex-1 truncate text-sm">
                          {stack.label}
                        </span>
                        <span className="relative shrink-0 text-sm tabular-nums text-muted-foreground">
                          {formatNumber(stack.job_count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {profile.levels.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Níveis</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {profile.levels.map((level) => (
                      <li key={level.level}>
                        <Badge variant="outline" className="text-[11px]">
                          {LEVEL_LABELS[level.level] ?? level.level} ·{" "}
                          {formatNumber(level.count)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {profile.locations.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Localidades</h3>
                  <ul className="space-y-1 text-sm">
                    {profile.locations.map((location) => (
                      <li
                        key={`${location.label}-${location.country_code}`}
                        className="flex justify-between gap-3"
                      >
                        <span className="truncate">
                          {location.label}
                          {location.country_code ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {location.country_code}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(location.count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {profile.recent_jobs.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Vagas recentes</h3>
                  <ul className="space-y-1.5 text-sm">
                    {profile.recent_jobs.map((job) => (
                      <li key={job.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{job.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {job.created_at.split("-").reverse().join("/")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
