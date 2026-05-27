-- Harden profile role updates and keep sensitive settings out of public reads.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS TEXT AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_profile_protected_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Nao e permitido alterar role do proprio perfil'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    RAISE EXCEPTION 'Nao e permitido alterar email por este fluxo'
      USING ERRCODE = '42501';
  END IF;

  IF to_jsonb(OLD)->>'password_hash' IS DISTINCT FROM to_jsonb(NEW)->>'password_hash' THEN
    RAISE EXCEPTION 'Nao e permitido alterar credenciais por este fluxo'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_protected_field_changes();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_user_profile_role()
  );

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TABLE IF NOT EXISTS public.site_private_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_private_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage private settings" ON public.site_private_settings;
CREATE POLICY "Admin can manage private settings"
  ON public.site_private_settings FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

INSERT INTO public.site_private_settings (key, value, updated_at)
SELECT key, value, updated_at
FROM public.site_settings
WHERE key = 'google_calendar'
  AND value ? 'refresh_token'
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;

UPDATE public.site_settings
SET value = jsonb_strip_nulls(
      jsonb_build_object(
        'is_connected', true,
        'connected_at', value->>'connected_at'
      )
    ),
    updated_at = now()
WHERE key = 'google_calendar'
  AND value ? 'refresh_token';

DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.site_settings;
CREATE POLICY "Anyone can read public settings"
  ON public.site_settings FOR SELECT
  USING (key IN ('pix_config', 'mentorship_checklist'));

DROP POLICY IF EXISTS "Admin can manage settings" ON public.site_settings;
CREATE POLICY "Admin can manage settings"
  ON public.site_settings FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
