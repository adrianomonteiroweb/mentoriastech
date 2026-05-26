ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_category_check";--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_check" CHECK (
	"category" IN (
		'dados',
		'ia',
		'desenvolvimento',
		'po',
		'pm',
		'qa',
		'cyber_security',
		'devops',
		'design',
		'pcd',
		'afirmativa_pessoas_pretas',
		'afirmativa_mulheres_tecnologia',
		'other'
	)
);
