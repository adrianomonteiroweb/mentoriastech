ALTER TABLE "jobs" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "stack_tags" text[] NOT NULL DEFAULT '{}';
