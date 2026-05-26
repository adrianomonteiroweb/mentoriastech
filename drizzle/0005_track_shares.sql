ALTER TABLE "content_items" ADD COLUMN IF NOT EXISTS "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_shares" (
	"path" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_items_share_count" ON "content_items" ("share_count" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_share_count" ON "jobs" ("share_count" DESC);
