-- Modalidade + cidades na inscrição de vagas por WhatsApp.
--
-- Por que manual: o journal do drizzle-kit está dessincronizado com o Neon
-- (ver drizzle/manual/job_alert_subscriptions.sql). Aplique este SQL DIRETO no
-- console do Neon (SQL Editor) ou `pnpm db:studio`, sem drizzle-kit.
--
-- Idempotente: pode ser re-executado sem erro.
--
-- work_model: all (remotas + presenciais/híbridas) | remote (só remotas)
--             | onsite_hybrid (só presenciais/híbridas).
-- cities:     cidades para vagas presenciais/híbridas (minúsculas). Só usadas
--             quando work_model != 'remote'; vazio = o bot casa pelo DDD.

ALTER TABLE "job_alert_subscriptions"
  ADD COLUMN IF NOT EXISTS "work_model" text DEFAULT 'all' NOT NULL,
  ADD COLUMN IF NOT EXISTS "cities" text[] DEFAULT '{}' NOT NULL;

-- Constraint guardada (idempotente): só cria se ainda não existir.
DO $$ BEGIN
  ALTER TABLE "job_alert_subscriptions"
    ADD CONSTRAINT "job_alert_subscriptions_work_model_check"
    CHECK ("work_model" IN ('all', 'remote', 'onsite_hybrid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
