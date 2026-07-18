-- =============================================================================
-- Órbita — Formação em Squad (tabelas formacao_*)
-- Aplicar MANUALMENTE no console do Neon.
-- O journal do drizzle-kit está dessincronizado; NÃO usar drizzle-kit generate/migrate.
--
-- Padrão do projeto (igual sim_*): sem RLS aqui — a autorização é feita nas rotas
-- de API (requireRole / getMenteeAccessSession). O acesso ao banco é via Drizzle
-- com credenciais completas.
--
-- Produto distinto do Sprint Simulator (sim_*): squad de até 5 alunos + 1 instrutor,
-- papéis rotativos, projetos obrigatórios, dailies bilíngues, encontros semanais.
--
-- Seed idempotente ao final (ON CONFLICT DO NOTHING). Reaplicar é seguro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FORMACAO_FASES — seed fixo (Fase 1 e Fase 2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_fases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "numero" integer NOT NULL,
  "nome" text NOT NULL,
  "objetivo" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "formacao_fases_numero_unique" UNIQUE ("numero")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_PAPEIS — 5 papéis por fase (seed). min_ocorrencias: Fase 1 = 1, Fase 2 = 2
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_papeis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fase_id" uuid NOT NULL REFERENCES "formacao_fases"("id") ON DELETE CASCADE,
  "chave" text NOT NULL,
  "nome" text NOT NULL,
  "nome_curto" text,
  "responsabilidades" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cor" text DEFAULT 'blue' NOT NULL,
  "min_ocorrencias" integer DEFAULT 1 NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "formacao_papeis_fase_chave_unique" UNIQUE ("fase_id", "chave")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_PROJETOS — 5 projetos obrigatórios (seed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_projetos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fase_id" uuid NOT NULL REFERENCES "formacao_fases"("id") ON DELETE CASCADE,
  "numero" integer NOT NULL,
  "chave" text NOT NULL,
  "nome" text NOT NULL,
  "problema" text,
  "objetivo" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "formacao_projetos_chave_unique" UNIQUE ("chave")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_REQUISITOS_PROJETO — requisitos mínimos e evidências por projeto (seed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_requisitos_projeto" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL REFERENCES "formacao_projetos"("id") ON DELETE CASCADE,
  "tipo" text DEFAULT 'requisito' NOT NULL,
  "texto" text NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "formacao_requisitos_tipo_check" CHECK ("tipo" IN ('requisito', 'evidencia')),
  CONSTRAINT "formacao_requisitos_unique" UNIQUE ("projeto_id", "tipo", "ordem")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_ETAPAS — learning steps por projeto (a sequência que o aluno percorre)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_etapas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL REFERENCES "formacao_projetos"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "o_que_e" text,
  "por_que_existe" text,
  "o_que_entregar" text,
  "o_que_desbloqueia" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_etapas_unique" UNIQUE ("projeto_id", "ordem")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_COMPETENCIAS — competências avaliáveis por fase (seed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_competencias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fase_id" uuid NOT NULL REFERENCES "formacao_fases"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "formacao_competencias_unique" UNIQUE ("fase_id", "nome")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_TURMAS — a squad (até 5 alunos + 1 instrutor)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_turmas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "instrutor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "empresa_ficticia" text,
  "link_meet" text,
  "data_inicio" date NOT NULL,
  "fase_atual" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'planejada' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_turmas_status_check"
    CHECK ("status" IN ('planejada', 'ativa', 'concluida', 'cancelada'))
);

-- -----------------------------------------------------------------------------
-- FORMACAO_MEMBROS — vínculo aluno ↔ turma. Máx 5 por turma (validado na API).
-- profile_id pode ser NULL quando o aluno foi convidado mas ainda não tem profile.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_membros" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turma_id" uuid NOT NULL REFERENCES "formacao_turmas"("id") ON DELETE CASCADE,
  "profile_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "nome" text,
  "iniciais" text,
  "status" text DEFAULT 'convidado' NOT NULL,
  "convidado_em" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_membros_status_check"
    CHECK ("status" IN ('convidado', 'ativo', 'inativo')),
  CONSTRAINT "formacao_membros_turma_email_unique" UNIQUE ("turma_id", "email")
);

CREATE INDEX IF NOT EXISTS "idx_formacao_membros_turma" ON "formacao_membros" ("turma_id");
CREATE INDEX IF NOT EXISTS "idx_formacao_membros_email" ON "formacao_membros" ("email");

-- -----------------------------------------------------------------------------
-- FORMACAO_ENCONTROS — encontros semanais (domingo 10h America/Fortaleza)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_encontros" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turma_id" uuid NOT NULL REFERENCES "formacao_turmas"("id") ON DELETE CASCADE,
  "numero" integer NOT NULL,
  "data" timestamptz NOT NULL,
  "link_meet" text,
  "tipo" text DEFAULT 'semanal' NOT NULL,
  "pauta" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "fase_id" uuid REFERENCES "formacao_fases"("id") ON DELETE SET NULL,
  "projeto_id" uuid REFERENCES "formacao_projetos"("id") ON DELETE SET NULL,
  "etapa_id" uuid REFERENCES "formacao_etapas"("id") ON DELETE SET NULL,
  "decisoes" text,
  "proximos_passos" text,
  "status" text DEFAULT 'agendado' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_encontros_status_check"
    CHECK ("status" IN ('agendado', 'realizado', 'cancelado')),
  CONSTRAINT "formacao_encontros_turma_numero_unique" UNIQUE ("turma_id", "numero")
);

CREATE INDEX IF NOT EXISTS "idx_formacao_encontros_turma" ON "formacao_encontros" ("turma_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_TAREFAS — tarefas da turma (instância). Vinculadas a projeto/etapa/papel.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_tarefas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turma_id" uuid NOT NULL REFERENCES "formacao_turmas"("id") ON DELETE CASCADE,
  "projeto_id" uuid REFERENCES "formacao_projetos"("id") ON DELETE SET NULL,
  "etapa_id" uuid REFERENCES "formacao_etapas"("id") ON DELETE SET NULL,
  "papel_id" uuid REFERENCES "formacao_papeis"("id") ON DELETE SET NULL,
  "membro_id" uuid REFERENCES "formacao_membros"("id") ON DELETE SET NULL,
  "titulo" text NOT NULL,
  "contexto" text,
  "motivo" text,
  "politica_ia" text,
  "prazo" timestamptz,
  "status" text DEFAULT 'a_fazer' NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_tarefas_status_check"
    CHECK ("status" IN ('a_fazer', 'em_andamento', 'bloqueada', 'em_revisao', 'concluida'))
);

CREATE INDEX IF NOT EXISTS "idx_formacao_tarefas_turma" ON "formacao_tarefas" ("turma_id");
CREATE INDEX IF NOT EXISTS "idx_formacao_tarefas_membro" ON "formacao_tarefas" ("membro_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_CRITERIOS_ACEITE — checklist de aceite por tarefa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_criterios_aceite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tarefa_id" uuid NOT NULL REFERENCES "formacao_tarefas"("id") ON DELETE CASCADE,
  "texto" text NOT NULL,
  "concluido" boolean DEFAULT false NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_formacao_criterios_tarefa" ON "formacao_criterios_aceite" ("tarefa_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_ENTREGAS — submissões do aluno. Cada reenvio é uma nova versão (histórico).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_entregas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tarefa_id" uuid NOT NULL REFERENCES "formacao_tarefas"("id") ON DELETE CASCADE,
  "membro_id" uuid NOT NULL REFERENCES "formacao_membros"("id") ON DELETE CASCADE,
  "tipo" text DEFAULT 'texto' NOT NULL,
  "conteudo" text,
  "arquivo_url" text,
  "versao" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_entregas_tipo_check"
    CHECK ("tipo" IN ('texto', 'arquivo', 'link', 'audio', 'produto', 'repositorio', 'pull_request')),
  CONSTRAINT "formacao_entregas_status_check"
    CHECK ("status" IN ('rascunho', 'enviada', 'correcao_solicitada', 'aprovada'))
);

CREATE INDEX IF NOT EXISTS "idx_formacao_entregas_tarefa" ON "formacao_entregas" ("tarefa_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_FEEDBACKS — comentários do instrutor por entrega
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_feedbacks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entrega_id" uuid NOT NULL REFERENCES "formacao_entregas"("id") ON DELETE CASCADE,
  "instrutor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "comentario" text NOT NULL,
  "status_solicitado" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_feedbacks_status_check"
    CHECK ("status_solicitado" IS NULL OR "status_solicitado" IN ('correcao_solicitada', 'aprovada'))
);

CREATE INDEX IF NOT EXISTS "idx_formacao_feedbacks_entrega" ON "formacao_feedbacks" ("entrega_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_CONTEUDOS — material vinculado a etapa/tarefa/encontro (nunca solto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_conteudos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turma_id" uuid REFERENCES "formacao_turmas"("id") ON DELETE CASCADE,
  "etapa_id" uuid REFERENCES "formacao_etapas"("id") ON DELETE SET NULL,
  "tarefa_id" uuid REFERENCES "formacao_tarefas"("id") ON DELETE SET NULL,
  "encontro_id" uuid REFERENCES "formacao_encontros"("id") ON DELETE SET NULL,
  "titulo" text NOT NULL,
  "explicacao" text,
  "por_que_importa" text,
  "exemplo" text,
  "tipo" text DEFAULT 'texto' NOT NULL,
  "url" text,
  "corpo" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_conteudos_tipo_check"
    CHECK ("tipo" IN ('texto', 'video', 'audio', 'arquivo', 'link', 'checklist')),
  CONSTRAINT "formacao_conteudos_status_check"
    CHECK ("status" IN ('rascunho', 'publicado'))
);

CREATE INDEX IF NOT EXISTS "idx_formacao_conteudos_etapa" ON "formacao_conteudos" ("etapa_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_CONTEUDO_ARQUIVOS — arquivos (Vercel Blob) vinculados a um conteúdo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_conteudo_arquivos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conteudo_id" uuid NOT NULL REFERENCES "formacao_conteudos"("id") ON DELETE CASCADE,
  "blob_url" text NOT NULL,
  "nome" text,
  "tipo" text,
  "tamanho" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_formacao_conteudo_arquivos_conteudo"
  ON "formacao_conteudo_arquivos" ("conteudo_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_PRESENCAS — confirmação/presença por membro em cada encontro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_presencas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "encontro_id" uuid NOT NULL REFERENCES "formacao_encontros"("id") ON DELETE CASCADE,
  "membro_id" uuid NOT NULL REFERENCES "formacao_membros"("id") ON DELETE CASCADE,
  "presenca" text DEFAULT 'pendente' NOT NULL,
  "confirmado_em" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_presencas_check"
    CHECK ("presenca" IN ('pendente', 'confirmado', 'presente', 'atrasado', 'ausente')),
  CONSTRAINT "formacao_presencas_unique" UNIQUE ("encontro_id", "membro_id")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_DAILY_ENTRIES — daily estruturada (5 campos PT) por membro por encontro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_daily_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "encontro_id" uuid NOT NULL REFERENCES "formacao_encontros"("id") ON DELETE CASCADE,
  "membro_id" uuid NOT NULL REFERENCES "formacao_membros"("id") ON DELETE CASCADE,
  "concluido_pt" text,
  "andamento_pt" text,
  "proximo_pt" text,
  "bloqueio_pt" text,
  "ajuda_pt" text,
  "registrado_em" timestamptz,
  "no_prazo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_daily_entries_unique" UNIQUE ("encontro_id", "membro_id")
);

-- -----------------------------------------------------------------------------
-- FORMACAO_DAILY_INGLES — versão EN + repetição incremental (Slow English)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_daily_ingles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "daily_entry_id" uuid NOT NULL REFERENCES "formacao_daily_entries"("id") ON DELETE CASCADE,
  "frase_completa_pt" text,
  "frase_completa_en" text,
  "incrementos" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "vocab" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'nao_iniciada' NOT NULL,
  "observacao_instrutor" text,
  "audio_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_daily_ingles_status_check"
    CHECK ("status" IN ('nao_iniciada', 'repetida_leitura', 'repetida_apoio', 'repetida_sem_leitura', 'usada_na_daily'))
);

CREATE INDEX IF NOT EXISTS "idx_formacao_daily_ingles_entry"
  ON "formacao_daily_ingles" ("daily_entry_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_ATRIBUICOES_PAPEL — papel exercido por membro por encontro.
-- HISTÓRICO IMUTÁVEL: a aplicação não deve fazer UPDATE/DELETE nesta tabela.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_atribuicoes_papel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turma_id" uuid NOT NULL REFERENCES "formacao_turmas"("id") ON DELETE CASCADE,
  "membro_id" uuid NOT NULL REFERENCES "formacao_membros"("id") ON DELETE CASCADE,
  "papel_id" uuid NOT NULL REFERENCES "formacao_papeis"("id") ON DELETE CASCADE,
  "encontro_id" uuid REFERENCES "formacao_encontros"("id") ON DELETE SET NULL,
  "atribuido_por" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "atribuido_em" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_formacao_atribuicoes_membro"
  ON "formacao_atribuicoes_papel" ("membro_id");
CREATE INDEX IF NOT EXISTS "idx_formacao_atribuicoes_turma"
  ON "formacao_atribuicoes_papel" ("turma_id");

-- -----------------------------------------------------------------------------
-- FORMACAO_CERTIFICADOS — certificado por membro+fase, com código verificável
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "formacao_certificados" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "membro_id" uuid NOT NULL REFERENCES "formacao_membros"("id") ON DELETE CASCADE,
  "fase_id" uuid NOT NULL REFERENCES "formacao_fases"("id") ON DELETE CASCADE,
  "codigo" uuid DEFAULT gen_random_uuid() NOT NULL,
  "aluno_nome" text,
  "fase_nome" text,
  "competencias_complementares" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "emitido_por" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "emitido_em" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "formacao_certificados_codigo_unique" UNIQUE ("codigo"),
  CONSTRAINT "formacao_certificados_membro_fase_unique" UNIQUE ("membro_id", "fase_id")
);

CREATE INDEX IF NOT EXISTS "idx_formacao_certificados_codigo"
  ON "formacao_certificados" ("codigo");

-- =============================================================================
-- SEED — dados fixos da formação (idempotente)
-- =============================================================================

-- Fases
INSERT INTO "formacao_fases" ("numero", "nome", "objetivo", "ordem") VALUES
  (1, 'Criador de Produtos Digitais com IA',
   'Preparar o aluno para identificar problemas reais, definir produtos e entregar soluções utilizando inteligência artificial.', 1),
  (2, 'Desenvolvedor de Software Júnior',
   'Preparar o aluno para compreender e desenvolver software tecnicamente, começando pela lógica com Pascal e evoluindo para projetos web e automação.', 2)
ON CONFLICT ("numero") DO NOTHING;

-- Papéis da Fase 1 (mínimo 1x cada para o Certificado 1)
INSERT INTO "formacao_papeis" ("fase_id", "chave", "nome", "nome_curto", "responsabilidades", "cor", "min_ocorrencias", "ordem")
SELECT f.id, v.chave, v.nome, v.nome_curto, v.responsabilidades::jsonb, v.cor, 1, v.ordem
FROM "formacao_fases" f
CROSS JOIN (VALUES
  ('facilitador', 'Facilitador', 'Facilitador',
   '["Conduzir a daily","Controlar o tempo","Confirmar bloqueios","Registrar próximos passos","Garantir que todos participem"]', 'amber', 1),
  ('produto', 'Produto e cliente', 'Produto',
   '["Representar a necessidade do usuário","Esclarecer a dor","Validar prioridades","Acompanhar o MVP","Revisar os critérios de aceite"]', 'blue', 2),
  ('requisitos', 'Processos e requisitos', 'Requisitos',
   '["Mapear o processo","Registrar gargalos","Escrever requisitos","Manter regras de negócio","Documentar decisões"]', 'green', 3),
  ('ux', 'UX e conteúdo', 'UX',
   '["Organizar a experiência","Revisar textos","Verificar clareza","Revisar responsividade","Observar acessibilidade"]', 'purple', 4),
  ('ia', 'Construção com IA e qualidade', 'IA/Qualidade',
   '["Conduzir a construção com IA","Registrar prompts relevantes","Validar o produto gerado","Executar testes","Registrar problemas"]', 'cyan', 5)
) AS v(chave, nome, nome_curto, responsabilidades, cor, ordem)
WHERE f.numero = 1
ON CONFLICT ("fase_id", "chave") DO NOTHING;

-- Papéis da Fase 2 (mínimo 2x cada para o Certificado 2)
INSERT INTO "formacao_papeis" ("fase_id", "chave", "nome", "nome_curto", "responsabilidades", "cor", "min_ocorrencias", "ordem")
SELECT f.id, v.chave, v.nome, v.nome_curto, v.responsabilidades::jsonb, v.cor, 2, v.ordem
FROM "formacao_fases" f
CROSS JOIN (VALUES
  ('facilitador_tecnico', 'Facilitador técnico', 'Facilitador',
   '["Conduzir a daily","Acompanhar bloqueios","Organizar próximos passos","Acompanhar pull requests","Garantir a atualização das tarefas"]', 'amber', 1),
  ('frontend', 'Front-end', 'Front-end',
   '["Componentes","Formulários","Integração com API","Estados de interface","Responsividade","Acessibilidade"]', 'blue', 2),
  ('backend', 'Back-end e banco de dados', 'Back-end',
   '["Endpoints","Regras de negócio","Validação no servidor","Persistência","Queries","Migrations"]', 'green', 3),
  ('qualidade', 'Qualidade', 'Qualidade',
   '["Critérios de aceite","Cenários de teste","Testes manuais","Testes automatizados","Bugs","Regressão"]', 'purple', 4),
  ('automacao', 'Automação, deploy e suporte', 'Automação',
   '["RPA","Logs","Execução","Configuração","Deploy","Monitoramento básico","Suporte e incidentes"]', 'cyan', 5)
) AS v(chave, nome, nome_curto, responsabilidades, cor, ordem)
WHERE f.numero = 2
ON CONFLICT ("fase_id", "chave") DO NOTHING;

-- Projetos
INSERT INTO "formacao_projetos" ("fase_id", "numero", "chave", "nome", "problema", "objetivo", "ordem")
SELECT (SELECT id FROM "formacao_fases" WHERE numero = 1), 1, 'landing', 'Landing page',
  'Uma empresa, profissional ou produto precisa apresentar claramente sua proposta, público, diferencial e chamada para ação.',
  'Entregar uma landing page publicada, responsiva e com formulário.', 1
UNION ALL SELECT (SELECT id FROM "formacao_fases" WHERE numero = 1), 2, 'site', 'Site corporativo',
  'Uma empresa precisa organizar sua presença digital e apresentar seus serviços de forma confiável.',
  'Entregar o site institucional com estrutura de páginas, conteúdo revisado e publicação online.', 2
UNION ALL SELECT (SELECT id FROM "formacao_fases" WHERE numero = 1), 3, 'sistema', 'Sistema simples',
  'Uma pequena operação possui tarefas manuais, informações desorganizadas ou dependência excessiva de planilhas.',
  'Entregar um sistema simples com CRUD, validação, estados vazios e persistência.', 3
UNION ALL SELECT (SELECT id FROM "formacao_fases" WHERE numero = 2), 4, 'sistema_medio', 'Sistema de complexidade média',
  'Resolver uma dor real de mercado com mais regras, relacionamentos e responsabilidades que o sistema da Fase 1.',
  'Entregar um sistema com autenticação, autorização, banco relacional, testes e deploy.', 4
UNION ALL SELECT (SELECT id FROM "formacao_fases" WHERE numero = 2), 5, 'rpa', 'RPA',
  'Uma operação real ou simulada possui uma tarefa repetitiva que pode ser automatizada.',
  'Entregar um RPA com entrada configurável, logs, evidências e relatório final.', 5
ON CONFLICT ("chave") DO NOTHING;

-- Requisitos mínimos por projeto
INSERT INTO "formacao_requisitos_projeto" ("projeto_id", "tipo", "texto", "ordem")
SELECT p.id, 'requisito', v.texto, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Identidade visual coerente', 1),
  ('Título e proposta de valor', 2),
  ('Seção de benefícios', 3),
  ('Público-alvo', 4),
  ('Chamada para ação', 5),
  ('Formulário', 6),
  ('Responsividade', 7),
  ('Acessibilidade básica', 8),
  ('SEO básico', 9),
  ('Página publicada', 10)
) AS v(texto, ordem)
WHERE p.chave = 'landing'
ON CONFLICT ("projeto_id", "tipo", "ordem") DO NOTHING;

INSERT INTO "formacao_requisitos_projeto" ("projeto_id", "tipo", "texto", "ordem")
SELECT p.id, 'requisito', v.texto, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Página inicial', 1),
  ('Página sobre', 2),
  ('Serviços', 3),
  ('Contato com formulário', 4),
  ('Navegação', 5),
  ('Responsividade', 6),
  ('Acessibilidade', 7),
  ('Identidade visual', 8),
  ('SEO básico', 9),
  ('Conteúdo adequado ao público', 10),
  ('Publicação', 11)
) AS v(texto, ordem)
WHERE p.chave = 'site'
ON CONFLICT ("projeto_id", "tipo", "ordem") DO NOTHING;

INSERT INTO "formacao_requisitos_projeto" ("projeto_id", "tipo", "texto", "ordem")
SELECT p.id, 'requisito', v.texto, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Autenticação quando necessária', 1),
  ('Cadastro', 2),
  ('Edição', 3),
  ('Consulta', 4),
  ('Exclusão controlada', 5),
  ('Busca ou filtro', 6),
  ('Validação e mensagens de erro', 7),
  ('Estados vazios', 8),
  ('Responsividade', 9),
  ('Persistência de dados', 10),
  ('Produto publicado', 11)
) AS v(texto, ordem)
WHERE p.chave = 'sistema'
ON CONFLICT ("projeto_id", "tipo", "ordem") DO NOTHING;

INSERT INTO "formacao_requisitos_projeto" ("projeto_id", "tipo", "texto", "ordem")
SELECT p.id, 'requisito', v.texto, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Autenticação e autorização', 1),
  ('Usuários e perfis', 2),
  ('Banco de dados relacional', 3),
  ('Múltiplas entidades e regras de negócio', 4),
  ('Filtros e paginação', 5),
  ('Histórico', 6),
  ('Validação no servidor', 7),
  ('Tratamento de erros e logs', 8),
  ('Testes automatizados', 9),
  ('Documentação', 10),
  ('Responsividade e acessibilidade', 11),
  ('Deploy', 12)
) AS v(texto, ordem)
WHERE p.chave = 'sistema_medio'
ON CONFLICT ("projeto_id", "tipo", "ordem") DO NOTHING;

INSERT INTO "formacao_requisitos_projeto" ("projeto_id", "tipo", "texto", "ordem")
SELECT p.id, 'requisito', v.texto, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Entrada configurável', 1),
  ('Execução automatizada', 2),
  ('Tratamento de erros', 3),
  ('Logs estruturados', 4),
  ('Captura de evidências', 5),
  ('Controle de tentativas', 6),
  ('Relatório final', 7),
  ('Documentação', 8),
  ('Proteção de credenciais', 9),
  ('Possibilidade de execução manual', 10),
  ('Status de execução', 11)
) AS v(texto, ordem)
WHERE p.chave = 'rpa'
ON CONFLICT ("projeto_id", "tipo", "ordem") DO NOTHING;

-- Etapas (sequência) por projeto.
-- O projeto "site" (vitrine do protótipo) recebe descrições completas; os demais
-- recebem nome + ordem (o instrutor enriquece os campos descritivos na Sprint 9).
INSERT INTO "formacao_etapas" ("projeto_id", "nome", "ordem")
SELECT p.id, v.nome, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Briefing e público', 1),
  ('Estrutura da página', 2),
  ('Construção com IA', 3),
  ('Publicação e testes', 4)
) AS v(nome, ordem)
WHERE p.chave = 'landing'
ON CONFLICT ("projeto_id", "ordem") DO NOTHING;

INSERT INTO "formacao_etapas" ("projeto_id", "nome", "o_que_e", "por_que_existe", "o_que_entregar", "o_que_desbloqueia", "ordem")
SELECT p.id, v.nome, v.o_que_e, v.por_que_existe, v.o_que_entregar, v.o_que_desbloqueia, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Mapeamento da empresa',
   'Entender a empresa fictícia, seus serviços e seu público.',
   'Sem entender a empresa, o site comunica a mensagem errada.',
   'Um resumo da empresa, serviços e público-alvo.',
   'Libera o levantamento de requisitos.', 1),
  ('Requisitos e conteúdo',
   'Levantar o que o site precisa ter e qual conteúdo cada página recebe.',
   'Define o escopo antes de construir, evitando retrabalho.',
   'Lista de requisitos e mapa de páginas.',
   'Libera a definição do MVP.', 2),
  ('Definição do MVP',
   'Selecionar o conjunto mínimo de funcionalidades que entrega valor real.',
   'Foca o esforço da squad no que valida o produto mais rápido.',
   'Uma lista priorizada de requisitos (obrigatório, importante, futuro).',
   'Libera a etapa de construção com IA.', 3),
  ('Construção com IA',
   'Construir as páginas do site usando IA como ferramenta.',
   'Transforma os requisitos definidos em um produto real.',
   'As páginas do site construídas e revisadas.',
   'Libera a publicação e homologação.', 4),
  ('Publicação e homologação',
   'Publicar o site e validar que tudo funciona.',
   'Um site só entrega valor quando está publicado e testado.',
   'O site publicado com link final e homologação.',
   'Conclui o projeto e libera o próximo.', 5)
) AS v(nome, o_que_e, por_que_existe, o_que_entregar, o_que_desbloqueia, ordem)
WHERE p.chave = 'site'
ON CONFLICT ("projeto_id", "ordem") DO NOTHING;

INSERT INTO "formacao_etapas" ("projeto_id", "nome", "ordem")
SELECT p.id, v.nome, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Problema e processo atual', 1),
  ('Requisitos e MVP', 2),
  ('Construção com IA', 3),
  ('Testes', 4),
  ('Publicação e feedback', 5)
) AS v(nome, ordem)
WHERE p.chave = 'sistema'
ON CONFLICT ("projeto_id", "ordem") DO NOTHING;

INSERT INTO "formacao_etapas" ("projeto_id", "nome", "ordem")
SELECT p.id, v.nome, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Compreensão do domínio', 1),
  ('Modelagem e requisitos', 2),
  ('Implementação', 3),
  ('Testes e pull request', 4),
  ('Deploy e documentação', 5)
) AS v(nome, ordem)
WHERE p.chave = 'sistema_medio'
ON CONFLICT ("projeto_id", "ordem") DO NOTHING;

INSERT INTO "formacao_etapas" ("projeto_id", "nome", "ordem")
SELECT p.id, v.nome, v.ordem
FROM "formacao_projetos" p
CROSS JOIN (VALUES
  ('Mapeamento da tarefa', 1),
  ('Definição de entradas', 2),
  ('Implementação', 3),
  ('Logs e evidências', 4),
  ('Relatório e documentação', 5)
) AS v(nome, ordem)
WHERE p.chave = 'rpa'
ON CONFLICT ("projeto_id", "ordem") DO NOTHING;

-- Competências
INSERT INTO "formacao_competencias" ("fase_id", "nome", "descricao", "ordem")
SELECT (SELECT id FROM "formacao_fases" WHERE numero = 1), v.nome, v.descricao, v.ordem
FROM (VALUES
  ('Definição de produto', 'Identifica problemas reais e define o MVP.', 1),
  ('Construção com IA', 'Constrói soluções utilizando IA com critério.', 2),
  ('Experiência e conteúdo', 'Organiza a experiência e revisa a comunicação.', 3),
  ('Colaboração em squad', 'Participa das dailies e das responsabilidades rotativas.', 4),
  ('Comunicação em inglês', 'Participou de dailies documentadas e exercícios de comunicação profissional em inglês utilizando slow English e repetição incremental.', 5)
) AS v(nome, descricao, ordem)
ON CONFLICT ("fase_id", "nome") DO NOTHING;

INSERT INTO "formacao_competencias" ("fase_id", "nome", "descricao", "ordem")
SELECT (SELECT id FROM "formacao_fases" WHERE numero = 2), v.nome, v.descricao, v.ordem
FROM (VALUES
  ('Lógica de programação', 'Compreende e aplica fundamentos de lógica.', 1),
  ('Desenvolvimento web', 'Desenvolve sistemas com stack moderna.', 2),
  ('Banco de dados', 'Modela e consulta banco relacional.', 3),
  ('Qualidade e testes', 'Escreve testes e trata erros.', 4),
  ('Automação (RPA)', 'Automatiza tarefas repetitivas com segurança.', 5),
  ('Comunicação em inglês', 'Participou de dailies documentadas e exercícios de comunicação profissional em inglês utilizando slow English e repetição incremental.', 6)
) AS v(nome, descricao, ordem)
ON CONFLICT ("fase_id", "nome") DO NOTHING;
