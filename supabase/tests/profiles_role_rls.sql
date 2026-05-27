-- RLS regression test for profile role escalation.
-- Run after migrations against a Supabase-compatible database.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    'authenticated',
    'authenticated',
    'rls-admin@example.com',
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'authenticated',
    'authenticated',
    'rls-mentee@example.com',
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'rls-admin@example.com', 'RLS Admin', 'mentee'),
  ('00000000-0000-4000-8000-000000000102', 'rls-mentee@example.com', 'RLS Mentee', 'mentee')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'admin'),
  ('00000000-0000-4000-8000-000000000102', 'mentee')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = now();

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',
  true
);

DO $$
DECLARE
  blocked BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = '00000000-0000-4000-8000-000000000102';
  EXCEPTION
    WHEN insufficient_privilege THEN
      blocked := true;
  END;

  IF NOT blocked THEN
    RAISE EXCEPTION 'Expected mentee profile role update to be blocked by RLS/trigger';
  END IF;
END;
$$;

RESET ROLE;

DO $$
DECLARE
  profile_role TEXT;
  dedicated_role TEXT;
BEGIN
  SELECT role INTO profile_role
  FROM public.profiles
  WHERE id = '00000000-0000-4000-8000-000000000102';

  SELECT role INTO dedicated_role
  FROM public.user_roles
  WHERE user_id = '00000000-0000-4000-8000-000000000102';

  IF profile_role IS DISTINCT FROM 'mentee' OR dedicated_role IS DISTINCT FROM 'mentee' THEN
    RAISE EXCEPTION 'Mentee role changed unexpectedly: profiles=%, user_roles=%',
      profile_role,
      dedicated_role;
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);

UPDATE public.profiles
SET role = 'hr'
WHERE id = '00000000-0000-4000-8000-000000000102';

RESET ROLE;

DO $$
DECLARE
  profile_role TEXT;
  dedicated_role TEXT;
BEGIN
  SELECT role INTO profile_role
  FROM public.profiles
  WHERE id = '00000000-0000-4000-8000-000000000102';

  SELECT role INTO dedicated_role
  FROM public.user_roles
  WHERE user_id = '00000000-0000-4000-8000-000000000102';

  IF profile_role IS DISTINCT FROM 'hr' OR dedicated_role IS DISTINCT FROM 'hr' THEN
    RAISE EXCEPTION 'Admin role update did not sync correctly: profiles=%, user_roles=%',
      profile_role,
      dedicated_role;
  END IF;
END;
$$;

ROLLBACK;
