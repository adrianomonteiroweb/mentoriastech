"use client"

import { useState } from "react"
import { Check, RotateCcw, SlidersHorizontal } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { AREA_FAMILIES, specialtiesOfFamily } from "@/lib/job-areas"
import type { JobFacets, FacetBucket } from "@/lib/db/job-listing"
import type { JobListQuery } from "@/lib/job-list-query"
import type { MultiKey } from "./use-job-filters"

// -----------------------------------------------------------------------------
// Painel de filtros — bottom sheet no celular.
//
// O QUE ISTO CORRIGE
//
// A pagina antiga empilhava tres linhas de chips + um grid de categorias ANTES
// da primeira vaga. No celular, a primeira tela inteira era controle, e so
// depois de rolar bastante e que aparecia conteudo. Aqui o topo fica com busca
// e dois chips rapidos, e o resto mora atras de "Filtros (n)".
//
// Sheet pela base (nao dialog centralizado) porque e onde o polegar alcanca.
//
// CADA OPCAO MOSTRA QUANTAS VAGAS PRODUZ. Antes a pessoa aplicava um filtro e
// so entao descobria que deu zero — tentativa e erro. A contagem vem de
// /api/jobs/facets, que ja ignora a propria dimensao, entao trocar de opcao
// continua possivel em vez de zerar tudo.
// -----------------------------------------------------------------------------

type Props = {
  query: JobListQuery
  facets: JobFacets
  activeCount: number
  isActive: (key: MultiKey, value: string) => boolean
  onToggle: (key: MultiKey, value: string) => void
  onSet: (key: "scope" | "has_salary" | "posted", value: string | null) => void
  onClearAll: () => void
}

function countOf(buckets: FacetBucket[], key: string) {
  return buckets.find((b) => b.key === key)?.count ?? 0
}

/** Opcao de filtro com contagem. Zero resultados => desabilitada, nao sumida. */
function Option({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  // Desabilita em vez de esconder: opcao que some faz a pessoa procurar algo
  // que ela sabe que existe. Desabilitada ela ve que existe e que, com os
  // filtros atuais, nao tem vaga.
  const empty = count === 0 && !selected

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${label}, ${count} ${count === 1 ? "vaga" : "vagas"}`}
      disabled={empty}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : empty
            ? "cursor-not-allowed border-border/60 bg-card text-muted-foreground/40"
            : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "ml-auto shrink-0 text-xs tabular-nums",
          selected ? "text-primary/70" : "text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {count}
      </span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function FilterSheet({
  query,
  facets,
  activeCount,
  isActive,
  onToggle,
  onSet,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState(false)

  // So mostra especialidades das familias escolhidas. Despejar as ~85 de uma
  // vez transformaria o painel numa parede de opcoes.
  const familiesForSpecialties =
    query.family.length > 0
      ? AREA_FAMILIES.filter((f) => query.family.includes(f.key))
      : []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            activeCount > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/40",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-bold leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex max-h-[88vh] flex-col gap-0 rounded-t-3xl p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base">Filtros</SheetTitle>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar tudo
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <Section title="Onde">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: null, label: "Todas", count: facets.total },
                { key: "br", label: "Brasil", count: countOf(facets.scopes, "br") },
                { key: "world", label: "Mundo", count: countOf(facets.scopes, "world") },
              ].map((opt) => (
                <Option
                  key={opt.label}
                  label={opt.label}
                  count={opt.count}
                  selected={(query.scope === "all" ? null : query.scope) === opt.key}
                  onClick={() => onSet("scope", opt.key)}
                />
              ))}
            </div>
          </Section>

          <Section title="Área">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AREA_FAMILIES.filter((f) => f.key !== "outros").map((family) => (
                <Option
                  key={family.key}
                  label={family.label}
                  count={countOf(facets.families, family.key)}
                  selected={isActive("family", family.key)}
                  onClick={() => onToggle("family", family.key)}
                />
              ))}
            </div>
          </Section>

          {familiesForSpecialties.map((family) => {
            const specialties = specialtiesOfFamily(family.key)
            if (specialties.length === 0) return null

            return (
              <Section key={family.key} title={`Especialidade · ${family.label}`}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {specialties.map((specialty) => (
                    <Option
                      key={specialty.key}
                      label={specialty.label}
                      count={countOf(facets.specialties, specialty.key)}
                      selected={isActive("specialty", specialty.key)}
                      onClick={() => onToggle("specialty", specialty.key)}
                    />
                  ))}
                </div>
              </Section>
            )
          })}

          <Section title="Nível">
            <div className="grid grid-cols-2 gap-2">
              {facets.levels.map((level) => (
                <Option
                  key={level.key}
                  label={level.label}
                  count={level.count}
                  selected={isActive("level", level.key)}
                  onClick={() => onToggle("level", level.key)}
                />
              ))}
            </div>
          </Section>

          <Section title="Modalidade">
            <div className="grid grid-cols-3 gap-2">
              {facets.job_types.map((type) => (
                <Option
                  key={type.key}
                  label={type.label}
                  count={type.count}
                  selected={isActive("job_type", type.key)}
                  onClick={() => onToggle("job_type", type.key)}
                />
              ))}
            </div>
          </Section>

          {facets.stacks.length > 0 && (
            <Section title="Tecnologia">
              <div className="grid grid-cols-2 gap-2">
                {facets.stacks.slice(0, 24).map((stack) => (
                  <Option
                    key={stack.key}
                    label={stack.label}
                    count={stack.count}
                    selected={isActive("stack", stack.key)}
                    onClick={() => onToggle("stack", stack.key)}
                  />
                ))}
              </div>
            </Section>
          )}

          {facets.countries.length > 0 && (
            <Section title="País">
              <div className="grid grid-cols-2 gap-2">
                {facets.countries.slice(0, 16).map((country) => (
                  <Option
                    key={country.key}
                    label={country.label}
                    count={country.count}
                    selected={isActive("country", country.key)}
                    onClick={() => onToggle("country", country.key)}
                  />
                ))}
              </div>
            </Section>
          )}

          {facets.inclusion.length > 0 && (
            <Section title="Vagas afirmativas e inclusivas">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {facets.inclusion.map((tag) => (
                  <Option
                    key={tag.key}
                    label={tag.label}
                    count={tag.count}
                    selected={isActive("inclusion", tag.key)}
                    onClick={() => onToggle("inclusion", tag.key)}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="Outros">
            <div className="grid grid-cols-2 gap-2">
              <Option
                label="Publicadas hoje"
                count={facets.today}
                selected={query.posted === "today"}
                onClick={() => onSet("posted", query.posted === "today" ? null : "today")}
              />
              <Option
                label="Com salário"
                count={facets.total}
                selected={query.has_salary === "true"}
                onClick={() =>
                  onSet("has_salary", query.has_salary === "true" ? null : "true")
                }
              />
            </div>
          </Section>
        </div>

        {/* Rodape fixo: a acao principal fica na zona do polegar, e o numero
            diz o que vai acontecer ANTES de fechar o painel. */}
        <div className="shrink-0 border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {facets.total === 0
              ? "Nenhuma vaga com estes filtros"
              : `Ver ${facets.total.toLocaleString("pt-BR")} ${facets.total === 1 ? "vaga" : "vagas"}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
