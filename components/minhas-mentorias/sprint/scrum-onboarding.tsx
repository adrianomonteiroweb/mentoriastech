"use client"

import { useEffect, useState } from "react"
import {
  Award,
  BookOpen,
  ClipboardList,
  KanbanSquare,
  Rocket,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STORAGE_KEY = "sim-scrum-tour-v1"

interface Step {
  icon: typeof Rocket
  title: string
  body: string
}

/**
 * Cada passo explica UM conceito (chunking → baixa carga cognitiva). A ordem
 * segue o fluxo real que o mentorado vai percorrer: contexto → quadro → foco →
 * daily → review → pontuação.
 */
const STEPS: Step[] = [
  {
    icon: Rocket,
    title: "Bem-vindo à sua sprint",
    body: "Você entrou como dev numa empresa fictícia. Uma sprint é um ciclo curto de trabalho com uma meta clara. Aqui você pratica o dia a dia de um time ágil de verdade — sem medo de errar.",
  },
  {
    icon: KanbanSquare,
    title: "O quadro Kanban",
    body: "Suas tarefas vivem em colunas: Backlog → To Do → Doing → Review → Done. Você 'puxa' uma tarefa para Doing quando começa, e move para a direita conforme avança. O quadro deixa o progresso visível para todos.",
  },
  {
    icon: Target,
    title: "Foco: uma tarefa por vez",
    body: "O limite de WIP (Work In Progress) pede que você mantenha só 1 tarefa em Doing. Terminar antes de começar outra reduz retrabalho e entrega valor mais rápido. Menos tarefas 'quase prontas', mais tarefas concluídas.",
  },
  {
    icon: ClipboardList,
    title: "A daily",
    body: "Todo dia, conte ao Tech Lead como você está — em 3 tipos: Progresso (o que fez/fará), Impedimento (o que te trava) e Dúvida (uma pergunta). Só impedimentos e dúvidas chegam ao inbox dele; o progresso fica registrado na timeline.",
  },
  {
    icon: BookOpen,
    title: "Review e avaliação",
    body: "Quando terminar uma tarefa, mova-a para Review. Uma avaliação automática confere seu código na hora e o Tech Lead revisa a entrega. Se algo faltar, ele devolve para ajustes — isso é normal e faz parte do aprendizado.",
  },
  {
    icon: Award,
    title: "Como você pontua",
    body: "Você ganha pontos por duas coisas: qualidade do código (avaliação) e por praticar o método ágil — fazer a daily, respeitar o foco e mover as tarefas pelo fluxo. Acompanhe tudo na aba Pontuação.",
  },
]

/**
 * Tour guiado de SCRUM/Kanban. Abre automaticamente no 1º acesso (persistido em
 * localStorage) e pode ser reaberto pelo botão "Guia SCRUM".
 */
export function ScrumOnboarding({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
      }
    } catch {
      // localStorage indisponível (SSR/modo restrito) — apenas não auto-abre.
    }
  }, [])

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) markSeen()
  }

  function openTour() {
    setIndex(0)
    setOpen(true)
  }

  const step = STEPS[index]
  const Icon = step.icon
  const isLast = index === STEPS.length - 1

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`min-h-[40px] gap-1.5 ${className || ""}`}
        onClick={openTour}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        Guia SCRUM
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <DialogTitle>{step.title}</DialogTitle>
            <DialogDescription className="leading-relaxed text-base">
              {step.body}
            </DialogDescription>
          </DialogHeader>

          {/* Indicador de progresso do tour (goal-gradient: fim visível). */}
          <div
            className="flex items-center justify-center gap-1.5 py-2"
            aria-label={`Passo ${index + 1} de ${STEPS.length}`}
          >
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-primary"
                    : i < index
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-secondary"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Pular
            </Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  Voltar
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) handleOpenChange(false)
                  else setIndex((i) => Math.min(STEPS.length - 1, i + 1))
                }}
              >
                {isLast ? "Começar" : "Próximo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
