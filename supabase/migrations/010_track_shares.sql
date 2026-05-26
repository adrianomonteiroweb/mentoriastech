-- Migration 010: track share counts for pages, content and jobs

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.page_shares (
  path TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  share_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read page shares" ON public.page_shares;
CREATE POLICY "Admin can read page shares"
  ON public.page_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can manage page shares" ON public.page_shares;
CREATE POLICY "Admin can manage page shares"
  ON public.page_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_items_share_count
  ON public.content_items(share_count DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_share_count
  ON public.jobs(share_count DESC);
