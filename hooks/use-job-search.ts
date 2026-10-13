"use client"

import { useEffect, useRef, useState } from "react"

// -----------------------------------------------------------------------------
// Busca de vagas para os seletores (plano de estudos, melhoria de curriculo).
//
// Por que existe: estes seletores baixavam a lista INTEIRA de vagas aprovadas e
// filtravam no cliente. Com ~1500 vagas/dia isso virou megabytes para preencher
// um dropdown. Agora a busca acontece no banco, e o seletor pede so a pagina
// que vai mostrar.
//
// De quebra a busca ficou melhor do que era: o servidor casa titulo, empresa e
// stack, enquanto o filtro do cliente so olhava o que ja tinha baixado.
// -----------------------------------------------------------------------------

export type JobSearchItem = {
  id: string
  title: string
  company: string | null
  description: string | null
  description_en: string | null
  stack_tags: string[]
  location: string | null
  job_type: string
  level: string
  category: string
  salary_range: string | null
  application_url: string | null
  is_international: boolean
  required_language: string | null
  language_level: string | null
}

const DEBOUNCE_MS = 300

export function useJobSearch({
  enabled = true,
  limit = 20,
}: { enabled?: boolean; limit?: number } = {}) {
  const [term, setTerm] = useState("")
  const [jobs, setJobs] = useState<JobSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  // Sequencia de requisicao: sem isto, uma resposta lenta de um termo antigo
  // pode chegar DEPOIS da resposta do termo atual e sobrescrever a lista certa.
  const requestId = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const id = ++requestId.current
    setLoading(true)

    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({ limit: String(limit) })
        if (term.trim()) params.set("q", term.trim())

        fetch(`/api/jobs?${params.toString()}`)
          .then((res) => res.json())
          .then((json) => {
            if (id !== requestId.current) return
            setJobs((json.data ?? []) as JobSearchItem[])
          })
          .catch(() => {
            if (id !== requestId.current) return
            setJobs([])
          })
          .finally(() => {
            if (id === requestId.current) setLoading(false)
          })
      },
      // A primeira carga nao espera: o dropdown abre ja com as vagas do dia.
      term ? DEBOUNCE_MS : 0,
    )

    return () => window.clearTimeout(timer)
  }, [term, enabled, limit])

  return { term, setTerm, jobs, loading }
}
