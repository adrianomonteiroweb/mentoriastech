-- Separate authorization roles from profiles and use user_roles as the RLS source.

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentee', 'hr')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role, assigned_at, created_at, updated_at)
SELECT id, role, now(), created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = now()
WHERE public.user_roles.role IS DISTINCT FROM EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.user_has_role(target_user_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role = ANY(allowed_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT public.user_has_role(auth.uid(), allowed_roles);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_has_role(ARRAY['admin']);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS TEXT AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_profile_protected_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.ensure_user_role_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.id, COALESCE(NEW.role, 'mentee'), auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET role = NEW.role,
      updated_at = now()
  WHERE id = NEW.user_id
    AND role IS DISTINCT FROM NEW.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_user_role_from_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at, updated_at)
    VALUES (NEW.id, NEW.role, auth.uid(), now(), now())
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at,
        updated_at = EXCLUDED.updated_at
    WHERE public.user_roles.role IS DISTINCT FROM EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_protected_field_changes();

DROP TRIGGER IF EXISTS profiles_ensure_user_role ON public.profiles;
CREATE TRIGGER profiles_ensure_user_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_role_for_profile();

DROP TRIGGER IF EXISTS sync_user_roles_to_profiles ON public.user_roles;
CREATE TRIGGER sync_user_roles_to_profiles
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_user_roles();

DROP TRIGGER IF EXISTS sync_profiles_role_to_user_roles ON public.profiles;
CREATE TRIGGER sync_profiles_role_to_user_roles
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_from_profiles();

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read all roles" ON public.user_roles;
CREATE POLICY "Admin can read all roles"
  ON public.user_roles FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can insert roles" ON public.user_roles;
CREATE POLICY "Admin can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
CREATE POLICY "Admin can update roles"
  ON public.user_roles FOR UPDATE
  USING (auth.role() = 'service_role' OR public.current_user_is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can delete roles" ON public.user_roles;
CREATE POLICY "Admin can delete roles"
  ON public.user_roles FOR DELETE
  USING (auth.role() = 'service_role' OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "HR can read mentee profiles" ON public.profiles;
CREATE POLICY "HR can read mentee profiles"
  ON public.profiles FOR SELECT
  USING (
    public.current_user_has_role(ARRAY['hr'])
    AND public.user_has_role(id, ARRAY['mentee'])
  );

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

DROP POLICY IF EXISTS "Admin can manage slots" ON public.mentoring_slots;
CREATE POLICY "Admin can manage slots"
  ON public.mentoring_slots FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage topics" ON public.mentoring_topics;
CREATE POLICY "Admin can manage topics"
  ON public.mentoring_topics FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all bookings" ON public.bookings;
CREATE POLICY "Admin can manage all bookings"
  ON public.bookings FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;
CREATE POLICY "Admin can manage all payments"
  ON public.payments FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage categories" ON public.content_categories;
CREATE POLICY "Admin can manage categories"
  ON public.content_categories FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all content" ON public.content_items;
CREATE POLICY "Admin can manage all content"
  ON public.content_items FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all jobs" ON public.jobs;
CREATE POLICY "Admin can manage all jobs"
  ON public.jobs FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage settings" ON public.site_settings;
CREATE POLICY "Admin can manage settings"
  ON public.site_settings FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage private settings" ON public.site_private_settings;
CREATE POLICY "Admin can manage private settings"
  ON public.site_private_settings FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can read page shares" ON public.page_shares;
CREATE POLICY "Admin can read page shares"
  ON public.page_shares FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage page shares" ON public.page_shares;
CREATE POLICY "Admin can manage page shares"
  ON public.page_shares FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all ads" ON public.ads;
CREATE POLICY "Admin can manage all ads"
  ON public.ads FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin can manage all tips" ON public.tips;
CREATE POLICY "Admin can manage all tips"
  ON public.tips FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
