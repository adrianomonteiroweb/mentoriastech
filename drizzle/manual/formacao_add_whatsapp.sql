-- Sprint 8: adiciona campo whatsapp à tabela formacao_membros
-- Executar manualmente no Neon após o formacao_schema.sql.
-- Idempotente: IF NOT EXISTS no ADD COLUMN (Postgres 11+).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'formacao_membros' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE "formacao_membros" ADD COLUMN "whatsapp" text;
  END IF;
END
$$;
