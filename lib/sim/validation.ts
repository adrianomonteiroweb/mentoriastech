import { z } from "zod"
import { simEvaluationRuleSchema } from "@/lib/sim/evaluation-types"
import { SIM_TASK_STATUSES } from "@/lib/sim/task-transitions"

/**
 * Schemas Zod compartilhados pelas rotas do Sprint Simulator
 * (route.ts do Next só pode exportar handlers).
 */

const markdownField = z.string().max(20_000).optional().or(z.literal(""))

export const simCompanySchema = z.object({
  name: z.string().min(2, "Nome da empresa e obrigatorio"),
  archetype: z.enum(["startup", "saas", "enterprise"]),
  description: markdownField,
  product_description: markdownField,
  client_description: markdownField,
  service_description: markdownField,
  process_description: markdownField,
  po_doc_markdown: markdownField,
  pm_doc_markdown: markdownField,
  tech_lead_doc_markdown: markdownField,
  is_active: z.boolean().optional(),
})

export const simTemplateSchema = z.object({
  company_id: z.string().uuid("Empresa invalida"),
  title: z.string().min(3, "Titulo e obrigatorio"),
  objective: z.string().max(20_000).optional().or(z.literal("")),
  level: z.number().int().min(1).max(6),
  duration_days: z.number().int().min(1).max(30),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const simTemplateTaskSchema = z.object({
  title: z.string().min(3, "Titulo da task e obrigatorio"),
  description: z.string().max(20_000).optional().or(z.literal("")),
  task_type: z.enum(["feature", "bug", "refactor", "architecture", "increment"]),
  points: z.number().int().min(1).max(100),
  initial_status: z.enum(["backlog", "todo"]),
  sort_order: z.number().int().min(0).optional(),
  evaluation_rules: z
    .array(simEvaluationRuleSchema)
    .max(20, "Maximo de 20 regras por task")
    .optional()
    .nullable(),
  // Gabarito (markdown) — opcional; visível ao mentorado só quando liberado.
  solution_markdown: z.string().max(20_000).optional().or(z.literal("")),
})

/** PUT de sprint task (mentor): campos parciais + liberar/ocultar gabarito. */
export const simSprintTaskUpdateSchema = simTemplateTaskSchema.partial().extend({
  solution_released: z.boolean().optional(),
})

// Path do workspace: relativo, sem "..", só caracteres seguros
export const simWorkspacePathSchema = z
  .string()
  .min(1, "Caminho e obrigatorio")
  .max(200, "Caminho muito longo (max 200 caracteres)")
  .regex(
    /^[\w\-./]+$/,
    "Caminho invalido: use apenas letras, numeros, hifen, ponto e barra",
  )
  .refine((path) => !path.includes(".."), "Caminho invalido")
  .refine(
    (path) => !path.startsWith("/") && !path.includes("//") && !path.endsWith("/"),
    "Caminho invalido",
  )

export const simWorkspaceCreateSchema = z.object({
  path: simWorkspacePathSchema,
  is_folder: z.boolean().optional(),
})

export const simWorkspaceFilePutSchema = z.object({
  path: simWorkspacePathSchema,
  content: z.string().max(100_000, "Arquivo muito grande (max 100KB)"),
})

/** Limite de arquivos/pastas por sprint (mantém payloads e avaliação leves) */
export const SIM_WORKSPACE_MAX_FILES = 200

export const simMoveTaskSchema = z.object({
  to_status: z.enum(SIM_TASK_STATUSES),
  sort_order: z.number().int().min(0).optional(),
})

export const simMessageSchema = z.object({
  body: z
    .string()
    .min(1, "Mensagem nao pode ser vazia")
    .max(4000, "Mensagem muito longa (max 4000 caracteres)"),
  task_id: z.string().uuid().optional().nullable(),
  // Progresso da daily (default), impedimento ou dúvida.
  kind: z.enum(["daily", "impediment", "doubt"]).optional().default("daily"),
})

export const simMentorMessageSchema = simMessageSchema.extend({
  adjustment: z
    .object({
      delta: z
        .number()
        .int()
        .min(-50)
        .max(50)
        .refine((value) => value !== 0, "Ajuste nao pode ser zero"),
      reason: z.string().min(3, "Motivo do ajuste e obrigatorio"),
      category: z.enum([
        "structure",
        "code",
        "tests",
        "architecture",
        "communication",
        "general",
      ]),
    })
    .optional(),
})

export const simApplicationReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  review_note: z.string().max(2000).optional().or(z.literal("")),
})

export const simApplySchema = z.object({
  template_id: z.string().uuid("Vaga invalida"),
  message: z.string().max(2000).optional().or(z.literal("")),
})

export const simSprintPatchSchema = z.object({
  status: z.enum(["completed", "cancelled"]),
  final_feedback: z.string().max(20_000).optional().or(z.literal("")),
  final_score: z.number().int().min(0).max(100).optional(),
})
