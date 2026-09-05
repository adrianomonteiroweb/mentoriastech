-- Taxonomia de vagas: empresas globais, stacks normalizadas e localidade.
--
-- Para que serve: `jobs.company` sempre foi texto livre e `jobs.stack_tags` um
-- array solto, entao a plataforma nao conseguia responder "quais stacks a
-- empresa X usa" nem agregar "principais localidades" (o campo `location` e
-- prosa: "São Paulo, São Paulo, Brasil"). Estas tabelas sao a camada
-- normalizada que o painel /jobs/insights agrega.
--
-- Por que manual: o journal do drizzle-kit esta dessincronizado com o Neon
-- (ver drizzle/manual/job_alert_subscriptions.sql). NAO rode `pnpm db:generate`
-- por causa deste arquivo — ele tentaria versionar um diff das 76 tabelas.
-- Aplique com `pnpm db:apply:job-taxonomy` (scripts/apply-migration-0031-job-taxonomy.ts)
-- ou cole DIRETO no SQL Editor do Neon.
--
-- Idempotente: pode ser re-executado sem erro.
--
-- O separador `--> statement-breakpoint` e a convencao do drizzle e e o que o
-- script de aplicacao usa para quebrar o arquivo em statements (necessario
-- porque os blocos DO $$ ... $$ contem ponto-e-virgula).

CREATE TABLE IF NOT EXISTS "job_companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "linkedin_slug" text,
  "linkedin_url" text,
  "website" text,
  "first_seen_at" timestamptz DEFAULT now() NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_companies_slug_unique"
  ON "job_companies" ("slug");--> statement-breakpoint

-- Indice parcial: so as empresas que tem pagina no LinkedIn entram na regra de
-- unicidade forte. E o que impede duas linhas para a mesma empresa quando o
-- nome chega grafado de dois jeitos.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_companies_linkedin_slug_unique"
  ON "job_companies" ("linkedin_slug") WHERE "linkedin_slug" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "job_company_aliases" (
  "alias_slug" text PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "job_companies"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stacks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "category" text DEFAULT 'other' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_stacks_key_unique" ON "stacks" ("key");--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "stacks" ADD CONSTRAINT "stacks_category_check"
    CHECK ("category" IN ('language','framework','database','cloud','tool','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "job_stacks" (
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  "stack_id" uuid NOT NULL REFERENCES "stacks"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("job_id", "stack_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_job_stacks_stack_id" ON "job_stacks" ("stack_id");--> statement-breakpoint

-- Colunas novas em jobs. `location`, `company` e `stack_tags` NAO saem: o
-- admin, os filtros e o portal publico dependem deles. Isto e camada adicional.
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "company_id"   uuid REFERENCES "job_companies"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "city"         text,
  ADD COLUMN IF NOT EXISTS "city_key"     text,
  ADD COLUMN IF NOT EXISTS "region"       text,
  ADD COLUMN IF NOT EXISTS "country_name" text,
  ADD COLUMN IF NOT EXISTS "country_code" text;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_country_code_check"
    CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- Indices do painel de indicadores.
--
-- O indice que sustenta TODAS as agregacoes e o (status, data DESC): as nove
-- queries do endpoint comecam filtrando por status + janela de periodo, e o
-- resto e GROUP BY sobre o conjunto ja estreitado. De proposito NAO existe
-- indice de coluna unica em level / category / job_type: cardinalidade baixa
-- demais para o planner usar, e cada um seria amplificacao de escrita no
-- caminho quente do ingest.
CREATE INDEX IF NOT EXISTS "idx_jobs_status_created_at"
  ON "jobs" ("status", "created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_jobs_status_source_posted_at"
  ON "jobs" ("status", "source_posted_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_jobs_company_id"
  ON "jobs" ("company_id") WHERE "company_id" IS NOT NULL;--> statement-breakpoint

-- Parciais: ficam pequenos enquanto o backfill nao terminou.
CREATE INDEX IF NOT EXISTS "idx_jobs_country_code"
  ON "jobs" ("country_code") WHERE "country_code" IS NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_jobs_city_key"
  ON "jobs" ("city_key") WHERE "city_key" IS NOT NULL;--> statement-breakpoint

-- GIN e para os filtros de array da UI ATUAL (stack_tags), nao para o painel —
-- o painel usa o join com job_stacks.
CREATE INDEX IF NOT EXISTS "idx_jobs_stack_tags_gin"
  ON "jobs" USING gin ("stack_tags");--> statement-breakpoint

-- Empresa x stack, historico completo. VIEW e nao tabela agregada de proposito:
-- o admin deleta vagas em massa por ids/status/company (app/api/admin/jobs),
-- as linhas de job_stacks somem por cascade e nada decrementaria um contador —
-- so um trigger resolveria, e o trigger recria a mesma classe de bug. Nesta
-- escala o custo da view e irrelevante perto do round trip HTTPS do neon-http.
--
-- Alimenta o drawer de empresa em /jobs/insights. O painel de "empresas que
-- mais contratam" NAO usa esta view: ele precisa respeitar o periodo escolhido.
CREATE OR REPLACE VIEW "job_company_stacks" AS
SELECT
  j.company_id,
  s.id    AS stack_id,
  s.key   AS stack_key,
  s.label AS stack_label,
  count(*)::int     AS job_count,
  max(j.created_at) AS last_seen_at
FROM jobs j
JOIN job_stacks js ON js.job_id = j.id
JOIN stacks s      ON s.id = js.stack_id
WHERE j.company_id IS NOT NULL
GROUP BY j.company_id, s.id, s.key, s.label;
