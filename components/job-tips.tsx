"use client"

import { useState } from "react"
import {
  FileText,
  Users,
  ClipboardList,
  Lightbulb,
  ChevronDown,
} from "lucide-react"

const TIPS = [
  {
    icon: FileText,
    title: "Fortaleça seu currículo",
    summary: "Adapte suas skills para cada vaga",
    details: [
      "Destaque hard e soft skills que correspondam aos requisitos da vaga",
      "Pesquise processos, produtos e mercado da empresa e inclua termos relevantes",
      "Quantifique resultados anteriores (ex: 'reduzi tempo de deploy em 40%')",
    ],
  },
  {
    icon: Users,
    title: "Conecte-se com a empresa",
    summary: "Networking aumenta suas chances",
    details: [
      "Encontre colaboradores da empresa no LinkedIn e envie uma conexão personalizada",
      "Identifique o recrutador ou gestor da vaga e demonstre interesse genuíno",
      "Interaja com conteúdos da empresa antes de se candidatar",
    ],
  },
  {
    icon: ClipboardList,
    title: "Documente e prepare-se",
    summary: "Organize-se para as próximas fases",
    details: [
      "Anote detalhes da empresa, cultura, stack e desafios do mercado",
      "Liste seus pontos fortes que se alinham com a oportunidade",
      "Prepare exemplos concretos de experiências relevantes para a entrevista",
    ],
  },
] as const

export function JobTips() {
  const [open, setOpen] = useState(false)
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Dicas para melhorar suas candidaturas
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-4 pb-4">
            {TIPS.map((tip, i) => {
              const Icon = tip.icon
              const isExpanded = expandedTip === i
              return (
                <button
                  key={i}
                  onClick={() => setExpandedTip(isExpanded ? null : i)}
                  className="flex flex-col rounded-lg border border-border/50 bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {tip.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tip.summary}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>

                  <div
                    className={`grid transition-all duration-200 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <ul className="overflow-hidden space-y-1.5 pl-11">
                      {tip.details.map((detail, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-[11px] text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
