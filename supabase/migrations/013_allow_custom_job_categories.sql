-- Migration 013: allow custom job categories while keeping slug validation

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_category_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_category_check
  CHECK (category ~ '^[a-z0-9_]{1,60}$');
