-- Painel de Oportunidades: 5 novas tabelas
-- companies, opportunity_resumes, opportunities, opportunity_events, message_templates

CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "name" text NOT NULL,
  "linkedin_url" text,
  "website" text,
  "industry" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_resumes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "label" text NOT NULL,
  "file_url" text NOT NULL,
  "file_size_bytes" integer,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text,
  "url" text,
  "description" text,
  "category" text,
  "city" text,
  "state" text,
  "status" text DEFAULT 'evaluating' NOT NULL,
  "finalization_type" text,
  "priority" text DEFAULT 'medium' NOT NULL,
  "work_model" text,
  "job_level" text,
  "salary_range" text,
  "contact_name" text,
  "contact_role" text,
  "contact_linkedin" text,
  "interview_type" text,
  "resume_id" uuid,
  "checklist" jsonb,
  "application_date" timestamp with time zone,
  "next_follow_up_at" timestamp with time zone,
  "next_interview_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "title" text,
  "body" text,
  "from_status" text,
  "to_status" text,
  "scheduled_at" timestamp with time zone,
  "is_completed" boolean DEFAULT false NOT NULL,
  "completed_at" timestamp with time zone,
  "author_id" uuid,
  "metadata" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunity_resumes" ADD CONSTRAINT "opportunity_resumes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_resume_id_opportunity_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."opportunity_resumes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Indexes para queries frequentes
CREATE INDEX "idx_opportunities_profile_status" ON "opportunities" ("profile_id", "status");
--> statement-breakpoint
CREATE INDEX "idx_opportunity_events_opportunity" ON "opportunity_events" ("opportunity_id", "occurred_at" DESC);
--> statement-breakpoint
-- Seed: templates de mensagem
INSERT INTO "message_templates" ("category", "title", "body", "sort_order") VALUES
('connect_recruiter', 'Conectar com recrutador', E'Ola, {{contato}}. Tudo bem?\n\nVi a oportunidade de {{vaga}} na {{empresa}} e realizei minha candidatura.\n\nTenho experiencia em {{area}} e acredito que posso contribuir com o time.\n\nFico a disposicao para conversar melhor sobre a oportunidade.\n\nObrigado!', 1),
('connect_employee', 'Conectar com pessoa da empresa', E'Ola, {{contato}}. Tudo bem?\n\nVi que voce trabalha na {{empresa}} e achei muito interessante o trabalho de voces.\n\nEstou acompanhando algumas oportunidades na area de tecnologia e gostaria de me conectar.', 2),
('send_resume', 'Enviar curriculo', E'Ola, {{contato}}.\n\nSegue meu curriculo para a vaga de {{vaga}} na {{empresa}}.\n\nDestaco minha experiencia em {{area}}, que acredito ser relevante para a posicao.\n\nFico a disposicao para qualquer duvida.\n\nObrigado!', 3),
('reply_recruiter', 'Responder recrutador', E'Ola, {{contato}}. Obrigado pelo contato!\n\nTenho muito interesse na oportunidade de {{vaga}} na {{empresa}}.\n\nEstou disponivel para conversar nos proximos dias.\n\nQual seria o melhor horario para voce?', 4),
('thank_interview', 'Agradecer entrevista', E'Ola, {{contato}}.\n\nObrigado pela oportunidade de conversar sobre a vaga de {{vaga}} na {{empresa}}.\n\nFoi muito bom conhecer mais sobre o time e os desafios da posicao.\n\nFico no aguardo dos proximos passos.\n\nObrigado!', 5),
('follow_up', 'Follow-up', E'Ola, {{contato}}. Tudo bem?\n\nEstou entrando em contato para saber se ha novidades sobre o processo seletivo para a vaga de {{vaga}} na {{empresa}}.\n\nContinuo muito interessado na oportunidade.\n\nFico a disposicao!', 6),
('ask_status', 'Perguntar status', E'Ola, {{contato}}.\n\nGostaria de saber como esta o andamento do processo seletivo para {{vaga}} na {{empresa}}.\n\nSigo a disposicao para qualquer etapa adicional.\n\nObrigado!', 7),
('negotiate_offer', 'Negociar proposta', E'Ola, {{contato}}.\n\nAgradeco muito pela proposta para a vaga de {{vaga}} na {{empresa}}.\n\nEstou muito animado com a oportunidade. Gostaria de conversar sobre alguns pontos da proposta para garantir que seja positiva para ambos os lados.\n\nPodemos agendar uma conversa?', 8),
('decline_offer', 'Recusar proposta', E'Ola, {{contato}}.\n\nAgradeco imensamente pela proposta para {{vaga}} na {{empresa}}.\n\nApos considerar com cuidado, decidi seguir em outra direcao neste momento.\n\nFoi um prazer conhecer o time e espero que possamos manter contato para futuras oportunidades.\n\nObrigado!', 9),
('ask_feedback', 'Pedir feedback apos negativa', E'Ola, {{contato}}.\n\nObrigado pelo retorno e pela oportunidade de participar do processo.\n\nMesmo nao avancando desta vez, continuo interessado em futuras oportunidades na {{empresa}}.\n\nSe possivel, gostaria de saber se ha algum feedback sobre minha participacao que possa me ajudar a melhorar.\n\nObrigado pelo tempo dedicado!', 10);
