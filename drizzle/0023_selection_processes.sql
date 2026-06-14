-- Processos seletivos: empresa + posicao, mentorados participantes e pontuacao
CREATE TABLE "selection_processes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company" text NOT NULL,
  "position" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'open' NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_process_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "process_id" uuid NOT NULL,
  "mentee_id" uuid NOT NULL,
  "score" integer,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "selection_processes" ADD CONSTRAINT "selection_processes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "selection_process_candidates" ADD CONSTRAINT "selection_process_candidates_process_id_selection_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."selection_processes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "selection_process_candidates" ADD CONSTRAINT "selection_process_candidates_mentee_id_profiles_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_selection_process_candidates_unique" ON "selection_process_candidates" ("process_id", "mentee_id");
