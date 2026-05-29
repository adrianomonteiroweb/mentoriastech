-- Migration 021: indicação de vagas pela comunidade + curtidas
-- 1. Nota da indicação ("por que achou interessante") na vaga
-- 2. Permitir indicação enxuta (sem empresa/descrição obrigatórias)
-- 3. Índice para agregar curtidas (job_actions.action_type = 'liked')
--    Obs: 'liked' é apenas um novo valor de action_type (coluna é TEXT, sem CHECK).

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recommendation_note TEXT;
ALTER TABLE public.jobs ALTER COLUMN company DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN description DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_actions_type_job
  ON public.job_actions(action_type, job_id);
