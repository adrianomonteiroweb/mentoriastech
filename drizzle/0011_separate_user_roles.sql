CREATE TABLE IF NOT EXISTS "user_roles" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "role" text DEFAULT 'mentee' NOT NULL,
  "assigned_by" uuid,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_roles_role_check" CHECK ("role" IN ('admin', 'mentee', 'hr'))
);--> statement-breakpoint
ALTER TABLE "user_roles"
  ADD CONSTRAINT "user_roles_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "user_roles"
  ADD CONSTRAINT "user_roles_assigned_by_profiles_id_fk"
  FOREIGN KEY ("assigned_by") REFERENCES "profiles"("id") ON DELETE set null;--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role", "created_at", "updated_at")
SELECT "id", "role", "created_at", "updated_at"
FROM "profiles"
ON CONFLICT ("user_id") DO UPDATE
SET "role" = EXCLUDED."role",
    "updated_at" = now()
WHERE "user_roles"."role" IS DISTINCT FROM EXCLUDED."role";--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.ensure_user_role_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.role, 'mentee'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;--> statement-breakpoint
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
$$ LANGUAGE plpgsql SET search_path = public;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.sync_user_role_from_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.user_roles (user_id, role, assigned_at, updated_at)
    VALUES (NEW.id, NEW.role, now(), now())
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        assigned_at = EXCLUDED.assigned_at,
        updated_at = EXCLUDED.updated_at
    WHERE public.user_roles.role IS DISTINCT FROM EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;--> statement-breakpoint
DROP TRIGGER IF EXISTS sync_user_roles_to_profiles ON "user_roles";--> statement-breakpoint
CREATE TRIGGER sync_user_roles_to_profiles
  AFTER INSERT OR UPDATE OF "role" ON "user_roles"
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_user_roles();--> statement-breakpoint
DROP TRIGGER IF EXISTS sync_profiles_role_to_user_roles ON "profiles";--> statement-breakpoint
CREATE TRIGGER sync_profiles_role_to_user_roles
  AFTER UPDATE OF "role" ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_from_profiles();
--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_ensure_user_role ON "profiles";--> statement-breakpoint
CREATE TRIGGER profiles_ensure_user_role
  AFTER INSERT ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_role_for_profile();
