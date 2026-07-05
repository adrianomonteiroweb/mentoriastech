import { z } from "zod"

/**
 * Tipos e schemas das regras de avaliação estática do Sprint Simulator.
 * As regras são autoradas pelo mentor (por task de template) e executadas
 * na Fase 2 contra os arquivos do workspace — nunca executando código do aluno.
 * Importado por lib/db/schema.ts para tipar as colunas jsonb.
 */

export type SimEvaluationCategory =
  | "structure"
  | "code"
  | "tests"
  | "architecture"

const ruleBase = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["structure", "code", "tests", "architecture"]),
  weight: z.number().int().min(1).max(10).default(1),
})

export const simEvaluationRuleSchema = z.discriminatedUnion("kind", [
  ruleBase.extend({ kind: z.literal("path_exists"), path: z.string().min(1) }),
  ruleBase.extend({
    kind: z.literal("path_matches"),
    pattern: z.string().min(1),
    min: z.number().int().min(1).optional(),
  }),
  ruleBase.extend({ kind: z.literal("path_absent"), pattern: z.string().min(1) }),
  ruleBase.extend({
    kind: z.literal("file_name_pattern"),
    dir: z.string().min(1),
    pattern: z.string().min(1),
  }),
  ruleBase.extend({
    kind: z.literal("content_includes"),
    path: z.string().min(1),
    regex: z.string().min(1),
    flags: z.string().max(5).optional(),
  }),
  ruleBase.extend({
    kind: z.literal("content_excludes"),
    path: z.string().min(1),
    regex: z.string().min(1),
    flags: z.string().max(5).optional(),
  }),
])

export type SimEvaluationRule = z.infer<typeof simEvaluationRuleSchema>

export interface SimEvaluationRuleResult {
  ruleId: string
  label: string
  category: SimEvaluationCategory
  passed: boolean
}

export interface SimEvaluationResult {
  results: SimEvaluationRuleResult[]
  passedWeight: number
  totalWeight: number
  /** Percentual 0..100 por categoria presente nas regras avaliadas */
  byCategory: Partial<Record<SimEvaluationCategory, number>>
  evaluatedAt: string
}
