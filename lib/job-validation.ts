import { z } from "zod"
import {
  JOB_CATEGORY_PATTERN,
  MAX_JOB_CATEGORY_LENGTH,
  normalizeJobCategory,
} from "@/lib/job-options"

export const jobCategorySchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeJobCategory(value) : value),
  z
    .string()
    .min(1)
    .max(MAX_JOB_CATEGORY_LENGTH)
    .regex(JOB_CATEGORY_PATTERN),
)
