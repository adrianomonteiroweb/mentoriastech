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
// required_language, language_level, company_url, city, region, country,
// country_code) são OPCIONAIS — o bot de busca os envia quando abriu a página
// da vaga e derivou a descrição. Antes só o update-jobs-info preenchia
// description/location depois; agora a vaga já pode nascer enriquecida.
//
// ATENÇÃO — o schema é .strict(): chave desconhecida vira 400 "Dados
// invalidos", e o bot trata 400 como falha SEM RETRY, ou seja, a vaga é perdida
// em silêncio. Ao adicionar um campo novo, o backend sobe PRIMEIRO (campos
// opcionais não mudam nada para o bot atual) e só depois o bot passa a enviá-lo.
// Não troque o .strict() por .passthrough() para contornar isso: o strict é o
// que pega typo de chave no payload do bot (ver o teste em
// __tests__/lib/job-share-schema.test.ts).
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
    // Empresa: URL da página no LinkedIn (/company/<slug>). É a chave FORTE do
    // registro global de empresas — resolve "Google" x "Google LLC" x "Google
    // Brasil" sem heurística de string.
    company_url: httpUrlSchema.optional(),
    // Localidade granular. O bot manda o que conseguiu extrair; o que faltar o
    // backend deriva do `location` livre (lib/job-location.ts), que é o que põe
    // as vagas do Glassdoor e as cadastradas à mão nos mesmos gráficos.
    city: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    country_code: z
      .string()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
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
