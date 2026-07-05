-- Sprint Simulator — tipo de mensagem da daily + pontuação de metodologia ágil.
--
-- Por que manual: o journal do drizzle-kit está dessincronizado com o Neon
-- (ver drizzle/manual/sim_sprint_simulator.sql). Aplique este SQL DIRETO no
-- console do Neon (SQL Editor) ou `pnpm db:studio`, sem drizzle-kit.
--
-- Idempotente: pode ser re-executado sem erro.

-- 1) sim_daily_messages.kind — separa Progresso (daily) / Impedimento / Dúvida.
ALTER TABLE "sim_daily_messages"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'daily' NOT NULL;

ALTER TABLE "sim_daily_messages"
  DROP CONSTRAINT IF EXISTS "sim_daily_messages_kind_check";
ALTER TABLE "sim_daily_messages"
  ADD CONSTRAINT "sim_daily_messages_kind_check"
  CHECK ("kind" IN ('daily', 'impediment', 'doubt'));

-- 2) sim_score_events — nova categoria 'agile' (pontuação de rituais ágeis).
ALTER TABLE "sim_score_events"
  DROP CONSTRAINT IF EXISTS "sim_score_events_category_check";
ALTER TABLE "sim_score_events"
  ADD CONSTRAINT "sim_score_events_category_check"
  CHECK ("category" IN ('structure', 'code', 'tests', 'architecture', 'communication', 'general', 'agile'));

-- 3) sim_score_events.event_key — idempotência dos eventos ágeis automáticos
--    (cada comportamento pontua uma única vez por sprint via ON CONFLICT DO NOTHING).
--    Índice único simples: eventos de avaliação/ajuste têm event_key NULL e o
--    Postgres trata NULLs como distintos (NULLS DISTINCT), então convivem sem conflito.
ALTER TABLE "sim_score_events"
  ADD COLUMN IF NOT EXISTS "event_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sim_score_events_event_key"
  ON "sim_score_events" ("sprint_id", "event_key");
