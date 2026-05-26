-- Migration 011: add PCD and affirmative categories to jobs

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_category_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_category_check
  CHECK (
    category IN (
      'dados',
      'ia',
      'desenvolvimento',
      'po',
      'pm',
      'qa',
      'cyber_security',
      'devops',
      'design',
      'pcd',
      'afirmativa_pessoas_pretas',
      'afirmativa_mulheres_tecnologia',
      'other'
    )
  );
