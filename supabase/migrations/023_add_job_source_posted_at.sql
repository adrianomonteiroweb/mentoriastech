-- Data estimada em que a vaga foi publicada na fonte original.
-- Vagas existentes passam a contar a partir da entrada na plataforma.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS source_posted_at TIMESTAMPTZ;

UPDATE public.jobs
SET source_posted_at = created_at
WHERE source_posted_at IS NULL;

ALTER TABLE public.jobs
  ALTER COLUMN source_posted_at SET DEFAULT now(),
  ALTER COLUMN source_posted_at SET NOT NULL;
