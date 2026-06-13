-- Study Plans (Plano de Estudos com IA — Minhas Mentorias)
-- NOTE: drizzle-kit regenerated this from a stale snapshot (0015), re-emitting
-- DDL for objects already applied by migrations 0016-0020. That redundant DDL
-- was removed; this migration only creates the genuinely new study_plans table.
-- The regenerated 0021 snapshot already reflects the full, correct schema.

CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text,
	"role_type" text,
	"stack" text,
	"seniority" text,
	"languages" jsonb,
	"frameworks" jsonb,
	"strengths" text,
	"weaknesses" text,
	"experience" text,
	"minutes_per_day" integer DEFAULT 30 NOT NULL,
	"linked_opportunity_ids" jsonb,
	"plan_markdown" text,
	"progress" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_study_plans_profile" ON "study_plans" USING btree ("profile_id","created_at");
