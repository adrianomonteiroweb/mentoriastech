-- Migration 006: content_views tracking + job_actions + view_count column
-- Run this on the Neon database

-- 1. Add view_count to content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- 2. Content views table (unique visitors per content)
CREATE TABLE IF NOT EXISTS public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON public.content_views(content_id);

-- 3. Job actions table (mentee feedback on jobs)
CREATE TABLE IF NOT EXISTS public.job_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,  -- 'applied', 'link_issue', 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_job_actions_job_id ON public.job_actions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_actions_user_id ON public.job_actions(user_id);

-- 4. Index for content ranking by views
CREATE INDEX IF NOT EXISTS idx_content_items_view_count ON public.content_items(view_count DESC);
