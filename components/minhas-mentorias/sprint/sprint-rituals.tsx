"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Circle, Flame } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ConceptTip } from "./concept-tip"
import type { SimScoreEventApi, SimSprintTaskApi } from "@/lib/types/database"

interface Props {
  tasks: SimSprintTaskApi[]
  currentDay: number
  /** Endpoint do ledger de pontuação (para ler os eventos ágeis do dia). */
  scoreEndpoint: string
  /** Força recarregar quando a pontuação muda (ex.: após enviar daily/mover card). */
  refreshKey?: number
}

interface Ritual {
  key: string
  label: string
  done: boolean
  tip: string
}

/**
 * Checklist gamificado dos rituais ágeis. Usa vieses cognitivos a favor do
 * aprendizado: barra de progresso (goal-gradient), streak de dailies (endowed
 * progress / aversão à perda) e itens em aberto sempre visíveis (efeito
 * Zeigarnik). Deriva o estado das tasks + eventos "agile" do ledger — sem novo
 * endpoint.
 */
export function SprintRituals({
  tasks,
  currentDay,
  scoreEndpoint,
  refreshKey,
}: Props) {
  const [events, setEvents] = useState<SimScoreEventApi[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(scoreEndpoint)
      const json = await res.json()
      if (res.ok) setEvents(json.data?.events ?? [])
    } finally {
      setLoaded(true)
    }
  }, [scoreEndpoint])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const agile = events.filter((e) => e.category === "agile")
  const dailyToday = agile.some((e) => e.event_key === `daily:${currentDay}`)
  const streak = new Set(
    agile
      .filter((e) => e.event_key?.startsWith("daily:"))
      .map((e) => e.event_key),
  ).size

  const doingCount = tasks.filter((t) => t.status === "doing").length
  const reviewedOrDone = tasks.some(
    (t) => t.status === "review" || t.status === "done",
  )
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "done")

  const rituals: Ritual[] = [
    {
      key: "daily",
      label: "Fazer a daily de hoje",
      done: dailyToday,
      tip: "Registre seu progresso na aba Daily. Comunicação constante é o coração do SCRUM.",
    },
    {
      key: "focus",
      label: "Manter 1 task em Doing (foco)",
      done: doingCount === 1,
      tip: "O WIP limit pede no máximo 1 task em andamento. Termine antes de puxar a próxima.",
    },
    {
      key: "review",
      label: "Enviar uma task para review",
      done: reviewedOrDone,
      tip: "Ao concluir, mova a task para Review. A avaliação roda e o Tech Lead confere a entrega.",
    },
    {
      key: "goal",
      label: "Bater a meta da sprint",
      done: allDone,
      tip: "A meta é concluir todas as tasks até o fim da sprint. Cada Done te aproxima dela.",
    },
  ]

  const doneCount = rituals.filter((r) => r.done).length
  const pct = Math.round((doneCount / rituals.length) * 100)

  if (!loaded) return null

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Rituais da sprint"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            Rituais da sprint
          </h3>
          <ConceptTip title="Rituais ágeis">
            Práticas do dia a dia de um time ágil. Cumpri-las rende pontos de{" "}
            <strong>Metodologia Ágil</strong> e constrói bons hábitos de dev.
          </ConceptTip>
        </div>
        {streak > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400"
            aria-label={`${streak} ${streak === 1 ? "dia" : "dias"} de daily`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {streak} {streak === 1 ? "dia" : "dias"} de daily
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Progress
          value={pct}
          className="h-2 flex-1"
          aria-label={`${doneCount} de ${rituals.length} rituais cumpridos`}
        />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {doneCount}/{rituals.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {rituals.map((ritual) => (
          <li key={ritual.key} className="flex items-center gap-2">
            {ritual.done ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="h-4 w-4 shrink-0 text-muted-foreground/40"
                aria-hidden="true"
              />
            )}
            <span
              className={`text-sm ${
                ritual.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {ritual.label}
            </span>
            <ConceptTip title={ritual.label} className="ml-auto">
              {ritual.tip}
            </ConceptTip>
          </li>
        ))}
      </ul>
    </section>
  )
}
