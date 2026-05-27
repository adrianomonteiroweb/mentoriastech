-- Unify dashboard authentication on Supabase Auth.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS password_hash;

DROP TABLE IF EXISTS public.sessions;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_protected_field_changes();
