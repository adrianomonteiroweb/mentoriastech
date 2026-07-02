-- Migração MANUAL — transcrição + resumo de mentorias por IA.
--
-- Por que manual: o journal do Drizzle está dessincronizado com o banco do Neon
-- (rodar `pnpm db:generate` mistura estas colunas com dezenas de mudanças já
-- aplicadas em produção, e `pnpm db:migrate` falharia com "already exists").
-- Portanto, aplique este SQL DIRETO no Neon (SQL Editor do console, ou
-- `pnpm db:studio`), sem passar pelo fluxo de migração do Drizzle.
--
-- É idempotente (IF NOT EXISTS) e barato: colunas text nullable não reescrevem a
-- tabela. As colunas são lidas de forma resiliente no app (via to_jsonb), então
-- o deploy do código não quebra caso este SQL ainda não tenha sido aplicado.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_transcript text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_transcript_status text;
