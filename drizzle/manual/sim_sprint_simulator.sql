-- Sprint Simulator — tabelas sim_* (aplicar manualmente no console do Neon).
-- O journal do drizzle-kit está dessincronizado; NÃO usar drizzle-kit generate/migrate.

CREATE TABLE IF NOT EXISTS "sim_companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "archetype" text DEFAULT 'startup' NOT NULL,
  "description" text,
  "product_description" text,
  "client_description" text,
  "service_description" text,
  "process_description" text,
  "po_doc_markdown" text,
  "pm_doc_markdown" text,
  "tech_lead_doc_markdown" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_companies_archetype_check"
    CHECK ("archetype" IN ('startup', 'saas', 'enterprise'))
);

CREATE TABLE IF NOT EXISTS "sim_sprint_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "sim_companies"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "objective" text,
  "level" integer DEFAULT 1 NOT NULL,
  "duration_days" integer DEFAULT 10 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_sprint_templates_level_check" CHECK ("level" BETWEEN 1 AND 6)
);

CREATE TABLE IF NOT EXISTS "sim_template_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "sim_sprint_templates"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "task_type" text DEFAULT 'feature' NOT NULL,
  "points" integer DEFAULT 10 NOT NULL,
  "initial_status" text DEFAULT 'backlog' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "evaluation_rules" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_template_tasks_task_type_check"
    CHECK ("task_type" IN ('feature', 'bug', 'refactor', 'architecture', 'increment')),
  CONSTRAINT "sim_template_tasks_initial_status_check"
    CHECK ("initial_status" IN ('backlog', 'todo'))
);

CREATE TABLE IF NOT EXISTS "sim_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "template_id" uuid NOT NULL REFERENCES "sim_sprint_templates"("id") ON DELETE CASCADE,
  "message" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "reviewed_at" timestamptz,
  "review_note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_applications_status_check"
    CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sim_applications_pending_unique"
  ON "sim_applications" ("profile_id", "template_id")
  WHERE "status" = 'pending';

CREATE TABLE IF NOT EXISTS "sim_sprints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "application_id" uuid REFERENCES "sim_applications"("id") ON DELETE SET NULL,
  "template_id" uuid REFERENCES "sim_sprint_templates"("id") ON DELETE SET NULL,
  "company_id" uuid REFERENCES "sim_companies"("id") ON DELETE SET NULL,
  "mentor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "objective" text,
  "duration_days" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "ended_at" timestamptz,
  "final_score" integer,
  "final_feedback" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_sprints_status_check"
    CHECK ("status" IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS "idx_sim_sprints_profile" ON "sim_sprints" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_sim_sprints_status" ON "sim_sprints" ("status");

CREATE TABLE IF NOT EXISTS "sim_sprint_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "sim_sprints"("id") ON DELETE CASCADE,
  "template_task_id" uuid REFERENCES "sim_template_tasks"("id") ON DELETE SET NULL,
  "task_number" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "task_type" text DEFAULT 'feature' NOT NULL,
  "points" integer DEFAULT 10 NOT NULL,
  "status" text DEFAULT 'backlog' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "evaluation_rules" jsonb,
  "last_evaluation" jsonb,
  "submitted_at" timestamptz,
  "approved_at" timestamptz,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_sprint_tasks_task_type_check"
    CHECK ("task_type" IN ('feature', 'bug', 'refactor', 'architecture', 'increment')),
  CONSTRAINT "sim_sprint_tasks_status_check"
    CHECK ("status" IN ('backlog', 'todo', 'doing', 'review', 'done'))
);

CREATE INDEX IF NOT EXISTS "idx_sim_sprint_tasks_sprint" ON "sim_sprint_tasks" ("sprint_id");

CREATE TABLE IF NOT EXISTS "sim_task_transitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "sim_sprint_tasks"("id") ON DELETE CASCADE,
  "sprint_id" uuid NOT NULL REFERENCES "sim_sprints"("id") ON DELETE CASCADE,
  "from_status" text NOT NULL,
  "to_status" text NOT NULL,
  "actor_role" text NOT NULL,
  "actor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "sprint_day" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_task_transitions_actor_role_check"
    CHECK ("actor_role" IN ('mentee', 'mentor'))
);

CREATE INDEX IF NOT EXISTS "idx_sim_task_transitions_sprint" ON "sim_task_transitions" ("sprint_id");

CREATE TABLE IF NOT EXISTS "sim_daily_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "sim_sprints"("id") ON DELETE CASCADE,
  "author_role" text NOT NULL,
  "author_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "task_id" uuid REFERENCES "sim_sprint_tasks"("id") ON DELETE SET NULL,
  "sprint_day" integer NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_daily_messages_author_role_check"
    CHECK ("author_role" IN ('mentee', 'mentor'))
);

CREATE INDEX IF NOT EXISTS "idx_sim_daily_messages_sprint" ON "sim_daily_messages" ("sprint_id");
CREATE INDEX IF NOT EXISTS "idx_sim_daily_messages_unread"
  ON "sim_daily_messages" ("sprint_id", "author_role")
  WHERE "read_at" IS NULL;

CREATE TABLE IF NOT EXISTS "sim_score_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "sim_sprints"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "sim_sprint_tasks"("id") ON DELETE SET NULL,
  "message_id" uuid REFERENCES "sim_daily_messages"("id") ON DELETE SET NULL,
  "source" text NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "delta" integer NOT NULL,
  "reason" text NOT NULL,
  "sprint_day" integer NOT NULL,
  "superseded_at" timestamptz,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sim_score_events_source_check" CHECK ("source" IN ('auto', 'manual')),
  CONSTRAINT "sim_score_events_category_check"
    CHECK ("category" IN ('structure', 'code', 'tests', 'architecture', 'communication', 'general'))
);

CREATE INDEX IF NOT EXISTS "idx_sim_score_events_sprint" ON "sim_score_events" ("sprint_id");

CREATE TABLE IF NOT EXISTS "sim_workspace_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "sim_sprints"("id") ON DELETE CASCADE,
  "path" text NOT NULL,
  "is_folder" boolean DEFAULT false NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sim_workspace_files_path_unique"
  ON "sim_workspace_files" ("sprint_id", "path");
