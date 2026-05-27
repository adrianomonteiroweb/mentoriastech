ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_category_check";--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_check" CHECK ("category" ~ '^[a-z0-9_]{1,60}$');
