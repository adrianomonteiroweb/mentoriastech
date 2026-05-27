-- Store resumes as private blob pathnames and audit sensitive access.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  route TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Admin can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Authenticated can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = actor_id
    OR public.current_user_has_role(ARRAY['admin', 'hr'])
  );

-- Do not keep exposing old public Blob URLs in application responses.
-- Affected mentees must reupload resumes so new files are stored as private blobs.
UPDATE public.profiles
SET resume_url = NULL,
    updated_at = now()
WHERE resume_url ~* '^https?://';
