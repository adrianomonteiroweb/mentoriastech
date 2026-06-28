"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Route, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TrajectoryTopic {
  id: string
  year: string
  text: string
}

interface TrajectoryCaptureProps {
  topics: TrajectoryTopic[]
  onChange: (topics: TrajectoryTopic[]) => void
  title?: string
  description?: string
  emptyHint?: string
}

export function TrajectoryCapture({
  topics,
  onChange,
  title = "Sua trajetória",
  description = "Em tópicos e em ordem cronológica, conte como você chegou até aqui. A IA usa isso para escrever o “Sobre”, respondendo “Qual é a sua trajetória profissional?”.",
  emptyHint = "Nenhum tópico ainda. Adicione marcos da sua jornada (opcional, mas deixa o “Sobre” bem mais forte).",
}: TrajectoryCaptureProps) {
  const [year, setYear] = useState("")
  const [text, setText] = useState("")

  function addTopic() {
    if (!text.trim()) return
    onChange([
      ...topics,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        year: year.trim(),
        text: text.trim(),
      },
    ])
    setYear("")
    setText("")
  }

  function removeTopic(id: string) {
    onChange(topics.filter((t) => t.id !== id))
  }

  function moveTopic(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= topics.length) return
    const next = [...topics]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Route className="h-4 w-4 text-primary" />
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
          maxLength={9}
          placeholder="Ano"
          aria-label="Ano"
          className="sm:w-24"
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addTopic()
            }
          }}
          placeholder="Ex.: comecei a estudar programação por conta própria"
          aria-label="Descrição do tópico"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTopic}
          disabled={!text.trim()}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {topics.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {topics.map((topic, index) => (
            <li
              key={topic.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-card/50 p-2.5"
            >
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => moveTopic(index, -1)}
                  disabled={index === 0}
                  aria-label="Mover para cima"
                  className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTopic(index, 1)}
                  disabled={index === topics.length - 1}
                  aria-label="Mover para baixo"
                  className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                {topic.year && (
                  <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {topic.year}
                  </span>
                )}
                <span className="text-sm text-foreground">{topic.text}</span>
              </div>
              <button
                type="button"
                onClick={() => removeTopic(topic.id)}
                aria-label="Remover tópico"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}
