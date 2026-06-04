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

export const createJobSchema = z.object({
  title: z.string().min(3),
  company: z.string().min(2),
  description: z.string().min(10),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  level: z.enum(["internship", "junior", "mid", "senior"]).default("junior"),
  category: jobCategorySchema.default("other"),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional(),
  is_international: z.boolean().default(false),
  required_language: z.string().optional(),
  language_level: z.enum(["basic", "intermediate", "advanced", "fluent"]).optional(),
  active_hours: jobActiveHoursSchema.default(0),
})
