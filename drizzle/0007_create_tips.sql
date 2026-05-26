CREATE TABLE IF NOT EXISTS "tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"placement" text DEFAULT 'both' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tips_placement_check" CHECK ("placement" IN ('content', 'jobs', 'both'))
);
--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tips_active_placement" ON "tips" ("is_active", "placement");
--> statement-breakpoint
INSERT INTO "tips" ("title", "body", "placement", "sort_order", "is_active")
SELECT
	'Aumente sua rede no LinkedIn',
	'Quantas conexões você tem no LinkedIn? Quanto mais conexões, mais você terá chance de aparecer em buscas de recrutadores por se aproximar da rede de conexões deles.',
	'both',
	1,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM "tips"
	WHERE "body" = 'Quantas conexões você tem no LinkedIn? Quanto mais conexões, mais você terá chance de aparecer em buscas de recrutadores por se aproximar da rede de conexões deles.'
);
