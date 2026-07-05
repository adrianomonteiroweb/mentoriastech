"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SimEvaluationResult } from "@/lib/types/database"

const CATEGORY_LABELS: Record<string, string> = {
  structure: "Estrutura",
  code: "Código",
  tests: "Testes",
  architecture: "Arquitetura",
}

/**
 * Checklist ✔/⚠ do resultado da avaliação automática — mostra cada
 * critério com texto (nunca só cor) e o percentual por categoria.
 */
export function EvaluationChecklist({
  evaluation,
}: {
  evaluation: SimEvaluationResult
}) {
  const passedCount = evaluation.results.filter((r) => r.passed).length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-foreground">
        {passedCount} de {evaluation.results.length} critérios atendidos
      </p>

      {Object.keys(evaluation.byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Percentual por categoria">
          {Object.entries(evaluation.byCategory).map(([category, percent]) => (
            <Badge key={category} variant="outline" className="text-sm py-1 px-2.5">
              {CATEGORY_LABELS[category] || category}:{" "}
              <span className="ml-1 tabular-nums font-semibold">{percent}%</span>
            </Badge>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-1.5" aria-label="Critérios avaliados">
        {evaluation.results.map((result) => (
          <li
            key={result.ruleId}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              result.passed
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span>
              <span className="sr-only">
                {result.passed ? "Atendido: " : "Pendente: "}
              </span>
              {result.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
