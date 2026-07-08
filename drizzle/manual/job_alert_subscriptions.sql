-- Inscrição de vagas por WhatsApp (self-service em "Minhas Mentorias").
--
-- Por que manual: o journal do drizzle-kit está dessincronizado com o Neon
-- (ver drizzle/manual/sim_sprint_simulator.sql). Aplique este SQL DIRETO no
-- console do Neon (SQL Editor) ou `pnpm db:studio`, sem drizzle-kit.
--
-- Idempotente: pode ser re-executado sem erro.

CREATE TABLE IF NOT EXISTS "job_alert_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT true NOT NULL,
  "name" text,
  "whatsapp" text,
  "positions" text[] DEFAULT '{}' NOT NULL,
  "stack" text[] DEFAULT '{}' NOT NULL,
  "levels" text[] DEFAULT '{}' NOT NULL,
  "ignore_words" text[] DEFAULT '{}' NOT NULL,
  "is_international" boolean DEFAULT true NOT NULL,
  "daily_limit" integer DEFAULT 10 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "job_alert_subscriptions_daily_limit_range"
    CHECK ("daily_limit" BETWEEN 1 AND 50)
);
