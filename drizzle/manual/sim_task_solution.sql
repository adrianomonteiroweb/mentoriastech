-- Sprint Simulator — gabarito (answer key) por task, liberável pelo mentor.
--
-- Por que manual: journal do drizzle-kit dessincronizado com o Neon
-- (ver drizzle/manual/sim_sprint_simulator.sql). Aplique este SQL DIRETO no
-- console do Neon (SQL Editor) ou `pnpm db:studio`, sem drizzle-kit.
--
-- Idempotente: pode ser re-executado sem erro.

-- Gabarito da instância de task (por mentorado). solution_released_at NULL =
-- oculto; quando o mentor libera, recebe o timestamp e o mentorado passa a ver.
ALTER TABLE "sim_sprint_tasks"
  ADD COLUMN IF NOT EXISTS "solution_markdown" text;
ALTER TABLE "sim_sprint_tasks"
  ADD COLUMN IF NOT EXISTS "solution_released_at" timestamptz;

-- Gabarito padrão no template (copiado p/ a sprint task na instanciação).
ALTER TABLE "sim_template_tasks"
  ADD COLUMN IF NOT EXISTS "solution_markdown" text;
