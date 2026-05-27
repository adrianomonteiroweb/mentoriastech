CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "target_user_id" uuid,
  "action" text NOT NULL,
  "route" text,
  "ip_address" text,
  "user_agent" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_target_user_id_profiles_id_fk"
  FOREIGN KEY ("target_user_id") REFERENCES "profiles"("id") ON DELETE set null;--> statement-breakpoint
UPDATE "profiles"
SET "resume_url" = NULL,
    "updated_at" = now()
WHERE "resume_url" ~* '^https?://';--> statement-breakpoint
