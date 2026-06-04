-- Migration 026: curtidas publicas em vagas
-- Visitantes sao identificados por um hash de cookie anonimo.

ALTER TABLE public.job_actions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.job_actions
  ADD COLUMN IF NOT EXISTS visitor_hash TEXT;

ALTER TABLE public.job_actions
  DROP CONSTRAINT IF EXISTS job_actions_actor_required;

ALTER TABLE public.job_actions
  ADD CONSTRAINT job_actions_actor_required CHECK (
    user_id IS NOT NULL OR (action_type = 'liked' AND visitor_hash IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_actions_public_like_unique
  ON public.job_actions(job_id, visitor_hash)
  WHERE action_type = 'liked' AND visitor_hash IS NOT NULL;
