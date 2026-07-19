import { z } from "zod"
import {
  JOB_CATEGORY_PATTERN,
  MAX_JOB_CATEGORY_LENGTH,
  normalizeJobCategory,
} from "@/lib/job-options"
import { MAX_JOB_ACTIVE_HOURS } from "@/lib/job-active-time"

export const jobCategorySchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeJobCategory(value) : value),
  z
    .string()
    .min(1)
    .max(MAX_JOB_CATEGORY_LENGTH)
    .regex(JOB_CATEGORY_PATTERN),
)

export const jobActiveHoursSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_JOB_ACTIVE_HOURS)

const httpUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol
      return protocol === "http:" || protocol === "https:"
    } catch {
      return false
    }
  }, "URL deve ser http(s)")

// Indicação da comunidade / bot: link + por que achou interessante (+ título).
// Os campos de enriquecimento (description, location, stack_tags, job_type,
// required_language, language_level) são OPCIONAIS — o bot de busca os envia
// quando abriu a página da vaga e derivou a descrição. Antes só o
// update-jobs-info preenchia description/location depois; agora a vaga já pode
// nascer enriquecida.
export const jobShareSchema = z
  .object({
    title: z.string().min(3).max(200),
    application_url: httpUrlSchema,
    recommendation_note: z.string().min(10).max(2000),
    company: z.string().max(150).optional(),
    active_hours: jobActiveHoursSchema.default(0),
    level: z
      .enum(["internship", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished"])
      .optional(),
    is_international: z.boolean().default(false),
    description: z.string().max(10000).optional(),
    location: z.string().max(500).optional(),
    stack_tags: z.array(z.string().min(1).max(50)).max(30).optional(),
    job_type: z.enum(["remote", "hybrid", "onsite"]).optional(),
    salary_range: z.string().max(200).optional(),
    required_language: z.string().max(50).optional(),
    language_level: z
      .enum(["a1", "a2", "b1", "b2", "c1", "c2", "basic", "intermediate", "advanced", "fluent"])
      .optional(),
    category: jobCategorySchema.optional(),
  })
  .strict()

export const createJobSchema = z.object({
  title: z.string().min(3),
  company: z.string().min(2),
  description: z.string().min(10),
  description_en: z.string().optional(),
  stack_tags: z.array(z.string().min(1).max(30)).max(15).default([]),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  level: z.enum(["internship", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished"]).default("junior"),
  category: jobCategorySchema.default("other"),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional(),
  is_international: z.boolean().default(false),
  required_language: z.string().optional(),
  language_level: z.enum(["a1", "a2", "b1", "b2", "c1", "c2", "basic", "intermediate", "advanced", "fluent"]).optional(),
  summary: z.string().max(4000).optional(),
  important_note: z.string().max(4000).optional(),
  active_hours: jobActiveHoursSchema.default(0),
})
