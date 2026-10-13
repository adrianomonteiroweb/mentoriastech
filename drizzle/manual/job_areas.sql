-- Areas de atuacao: familia > especialidade, nivel inferido e eixo de inclusao.
--
-- Para que serve: ate aqui a area da vaga era UM campo (`jobs.category`) com 16
-- valores planos. Com ~1500 vagas/dia vindas do mercado inteiro (UX research,
-- SRE, scrum master, suporte, Salesforce, DevRel...) isso nao representa o que
-- entra, e o filtro do portal nao consegue levar a pessoa ate a vaga dela.
--
-- Alem disso `pcd` e as afirmativas moravam NO MESMO CAMPO da area: uma vaga de
-- frontend para PCD saia do filtro "Desenvolvimento" — o filtro escondia a vaga
-- exatamente de quem ela foi feita para alcancar. Por isso inclusao vira um
-- eixo PROPRIO (array acumulavel), e nao um valor de area.
--
-- `jobs.category` NAO e removida nesta migracao, de proposito: o admin, o
-- formulario de HR e o painel /jobs/insights ainda leem dela. As colunas novas
-- convivem com ela ate a UI inteira migrar.
--
-- Por que manual: o journal do drizzle-kit esta dessincronizado com o Neon
-- (ver drizzle/manual/job_taxonomy.sql). NAO rode `pnpm db:generate` por causa
-- deste arquivo. Aplique com `pnpm db:apply:job-areas` ou cole no SQL Editor.
--
-- Idempotente: pode ser re-executado sem erro.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "area_family" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "area_specialty" text;--> statement-breakpoint

-- Como a classificacao foi obtida: 'title' | 'stack' | 'legacy' | 'fallback'.
-- Existe para medir a qualidade da inferencia depois (quantas vagas cairam em
-- fallback?) sem ter que readivinhar em cima do resultado.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "area_source" text;--> statement-breakpoint

-- Eixo de inclusao. Array e nao booleanos separados porque e acumulavel
-- (afirmativa para mulheres negras = duas flags) e o conjunto cresce.
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "inclusion_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint

-- `level` foi inferido do titulo, em vez de ter vindo do bot? O bot grava
-- level='junior' como DEFAULT quando nao classifica, o que poluia justamente o
-- filtro de quem esta comecando. Saber a origem permite confiar de novo nele.
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "level_inferred" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- DRIFT DE SCHEMA — ler antes de mexer em niveis.
--
-- O codigo (lib/db/schema.ts, lib/job-validation.ts, JOB_LEVEL_ORDER) aceita 8
-- niveis desde que staff/senior_staff/principal/distinguished foram
-- introduzidos, mas NENHUMA migracao jamais atualizou o CHECK criado em
-- supabase/migrations/001_add_job_level_and_slots.sql, que so conhece 4. Onde o
-- CHECK antigo ainda estiver vivo, inserir 'staff' falha em runtime — passa no
-- CI e quebra em producao. Este bloco reconcilia o banco com o codigo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_level_check'
  ) THEN
    ALTER TABLE "jobs" DROP CONSTRAINT "jobs_level_check";
  END IF;

  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_level_check"
    CHECK ("level" IN ('internship','junior','mid','senior','staff','senior_staff','principal','distinguished'));
END $$;--> statement-breakpoint

-- Chaves sao slugs do catalogo de lib/job-areas.ts. CHECK de FORMATO, nao de
-- valor: o catalogo evolui em TS e nao pode exigir migracao a cada
-- especialidade nova. Chave desconhecida ainda recebe label decente
-- (getAreaSpecialtyLabel), entao nada quebra na UI.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_area_family_format_check'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_area_family_format_check"
      CHECK ("area_family" IS NULL OR "area_family" ~ '^[a-z0-9-]{1,60}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_area_specialty_format_check'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_area_specialty_format_check"
      CHECK ("area_specialty" IS NULL OR "area_specialty" ~ '^[a-z0-9-]{1,60}$');
  END IF;
END $$;--> statement-breakpoint

-- INDICES
--
-- O portal lista SEMPRE com status='approved' + ORDER BY created_at DESC, e o
-- filtro de area e o mais usado. Por isso os indices compostos comecam por
-- (status, area_*) e terminam em created_at DESC: servem o filtro E a ordenacao
-- por keyset na mesma varredura, sem sort extra.
CREATE INDEX IF NOT EXISTS "idx_jobs_status_area_family_created_at"
  ON "jobs" ("status", "area_family", "created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_jobs_status_area_specialty_created_at"
  ON "jobs" ("status", "area_specialty", "created_at" DESC);--> statement-breakpoint

-- Nivel entrou agora como indice composto (o job_taxonomy.sql decidiu nao
-- indexar `level` sozinho, e continua certo: sozinho ele e pouco seletivo).
CREATE INDEX IF NOT EXISTS "idx_jobs_status_level_created_at"
  ON "jobs" ("status", "level", "created_at" DESC);--> statement-breakpoint

-- GIN: `inclusion_tags && ARRAY[...]` e o filtro de inclusao.
CREATE INDEX IF NOT EXISTS "idx_jobs_inclusion_tags_gin"
  ON "jobs" USING gin ("inclusion_tags");--> statement-breakpoint

-- Busca textual. pg_trgm para casar substring e erro de digitacao em titulo e
-- empresa ("designer" achando "Design de Produto"), que e o que a busca atual
-- do cliente nao faz. Se a extensao nao puder ser criada, a busca cai para ILIKE
-- sem indice — mais lenta, porem correta; por isso o bloco nao aborta.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indisponivel: a busca cai para ILIKE sem indice';
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS "idx_jobs_title_trgm"
      ON "jobs" USING gin ("title" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "idx_jobs_company_trgm"
      ON "jobs" USING gin ("company" gin_trgm_ops);
  END IF;
END $$;--> statement-breakpoint

-- like_count materializado.
--
-- Hoje GET /api/jobs faz um GROUP BY da tabela INTEIRA de job_actions a cada
-- request so para contar curtidas, e depois ordena em JS. Com a contagem na
-- propria linha, a listagem vira uma varredura so, indexada.
--
-- A rota de actions mantem o valor; o backfill reconcilia. O indice parcial
-- serve a ordenacao "mais curtidas" sem pesar nas vagas com zero curtida, que
-- sao a esmagadora maioria.
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_jobs_status_like_count"
  ON "jobs" ("status", "like_count" DESC, "created_at" DESC)
  WHERE "like_count" > 0;--> statement-breakpoint

UPDATE "jobs" j SET "like_count" = COALESCE(a.cnt, 0)
FROM (
  SELECT job_id, count(*)::int AS cnt
  FROM job_actions WHERE action_type = 'liked' GROUP BY job_id
) a
WHERE a.job_id = j.id AND j."like_count" IS DISTINCT FROM a.cnt;
