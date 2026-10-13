"use client"

import { useCallback, useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { JobListQuery } from "@/lib/job-list-query"

// -----------------------------------------------------------------------------
// Estado dos filtros — NA URL.
//
// Antes os filtros moravam em useState + localStorage, o que custava tres
// coisas: nao dava para COMPARTILHAR uma busca ("vagas de UX research remotas
// no Brasil"), o botao voltar do celular saia do portal em vez de desfazer o
// filtro, e o Google nao tinha nenhuma pagina de cauda longa para indexar.
//
// Na URL os tres problemas somem de uma vez, e o servidor passa a conseguir
// renderizar a primeira pagina ja filtrada.
//
// PREFERENCIA PESSOAL CONTINUA NO LOCALSTORAGE (useUserPreferences): modo
// lista/match, vagas escondidas, dicas. Isso e de quem usa, nao da busca — nao
// faz sentido viajar num link compartilhado.
// -----------------------------------------------------------------------------

/** Dimensoes multivalor: alternam um valor dentro da lista. */
export const MULTI_KEYS = [
  "family",
  "specialty",
  "level",
  "job_type",
  "country",
  "stack",
  "inclusion",
] as const

export type MultiKey = (typeof MULTI_KEYS)[number]

/** Dimensoes de valor unico. */
export type SingleKey = "q" | "scope" | "company" | "has_salary" | "posted" | "sort"

export function useJobFilters(query: JobListQuery) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const commit = useCallback(
    (next: URLSearchParams) => {
      // `cursor` e posicao de rolagem, nao filtro: carregar com um cursor de
      // outra busca mostraria a lista comecando no meio.
      next.delete("cursor")

      const qs = next.toString()

      startTransition(() => {
        // replace, nao push: cada toque num chip nao pode virar uma entrada no
        // historico, senao o botao voltar precisa de 12 toques para sair do
        // portal. O scroll fica onde esta — a lista e o contexto.
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router],
  )

  /** Liga/desliga um valor de uma dimensao multivalor. */
  const toggle = useCallback(
    (key: MultiKey, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      const current = (next.get(key) ?? "").split(",").filter(Boolean)

      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]

      if (updated.length > 0) next.set(key, updated.join(","))
      else next.delete(key)

      commit(next)
    },
    [commit, searchParams],
  )

  /** Define (ou limpa, com valor vazio/null) uma dimensao de valor unico. */
  const set = useCallback(
    (key: SingleKey, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())

      if (value) next.set(key, value)
      else next.delete(key)

      commit(next)
    },
    [commit, searchParams],
  )

  /** Remove uma dimensao inteira — usado pelo "x" dos chips aplicados. */
  const clear = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams.toString())
      next.delete(key)
      commit(next)
    },
    [commit, searchParams],
  )

  const clearAll = useCallback(() => {
    commit(new URLSearchParams())
  }, [commit])

  const isActive = useCallback(
    (key: MultiKey, value: string) =>
      (query[key] as string[] | undefined)?.includes(value) ?? false,
    [query],
  )

  /**
   * Quantas dimensoes estao filtrando. E o numero do botao "Filtros (n)" —
   * conta DIMENSOES e nao valores, para "3 areas selecionadas" nao parecer
   * tres filtros diferentes.
   */
  const activeCount = useMemo(() => {
    let count = 0
    for (const key of MULTI_KEYS) {
      if ((query[key] as string[] | undefined)?.length) count++
    }
    if (query.scope !== "all") count++
    if (query.company) count++
    if (query.has_salary) count++
    if (query.posted) count++
    return count
  }, [query])

  /** Chave de identidade da busca. Muda => a lista acumulada tem de reiniciar. */
  const queryKey = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete("cursor")
    next.sort()
    return next.toString()
  }, [searchParams])

  return {
    toggle,
    set,
    clear,
    clearAll,
    isActive,
    activeCount,
    queryKey,
    /** true enquanto o servidor re-renderiza: a lista fica esmaecida, nao some. */
    isPending,
  }
}
