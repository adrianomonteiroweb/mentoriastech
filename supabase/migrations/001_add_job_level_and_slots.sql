-- Migration: adicionar campo level na tabela jobs, novos slots e conteúdos iniciais
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna level à tabela jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'junior'
  CHECK (level IN ('internship', 'junior', 'mid', 'senior'));

CREATE INDEX IF NOT EXISTS idx_jobs_level ON public.jobs(level);

-- 2. Limpar slots antigos e inserir novos horários
DELETE FROM public.mentoring_slots
  WHERE slot_type = 'free'
  AND rrule IS NULL;

INSERT INTO public.mentoring_slots (day_of_week, start_time, slot_type) VALUES
  (1, '21:00', 'free'),  -- Segunda 21:00
  (2, '21:00', 'free'),  -- Terça 21:00
  (3, '21:00', 'free'),  -- Quarta 21:00
  (4, '21:00', 'free'),  -- Quinta 21:00
  (5, '21:00', 'free'),  -- Sexta 21:00
  (6, '10:00', 'free'),  -- Sábado 10:00
  (6, '14:00', 'free'),  -- Sábado 14:00
  (0, '10:00', 'free'),  -- Domingo 10:00
  (0, '14:00', 'free');  -- Domingo 14:00

-- 3. Categorias de conteúdo (se ainda não existirem)
INSERT INTO public.content_categories (name, slug, description, sort_order)
SELECT * FROM (VALUES
  ('Carreira', 'carreira', 'Dicas e guias sobre carreira em tecnologia', 1),
  ('Programação', 'programacao', 'Tutoriais e materiais sobre programação', 2),
  ('Entrevistas', 'entrevistas', 'Preparação para processos seletivos', 3)
) AS v(name, slug, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.content_categories LIMIT 1);

-- 4. Conteúdos iniciais (se ainda não existirem)
INSERT INTO public.content_items (category_id, title, description, content_type, url, is_published)
SELECT * FROM (VALUES
  ((SELECT id FROM public.content_categories WHERE slug = 'programacao'),
   'Como iniciar na programação em 2025',
   'Guia completo para quem quer começar a programar do zero, com dicas de linguagens, recursos gratuitos e plano de estudos.',
   'article', NULL, true),
  ((SELECT id FROM public.content_categories WHERE slug = 'entrevistas'),
   'Preparação para entrevistas técnicas',
   'Vídeo com as principais perguntas de entrevistas para desenvolvedores júnior e como se preparar para cada uma delas.',
   'video', 'https://youtube.com', true),
  ((SELECT id FROM public.content_categories WHERE slug = 'carreira'),
   'Roadmap de carreira em tecnologia',
   'PDF com o mapa de carreira desde estágio até sênior, com habilidades esperadas em cada nível.',
   'pdf', NULL, true),
  ((SELECT id FROM public.content_categories WHERE slug = 'programacao'),
   'Introdução ao Next.js com App Router',
   'Tutorial passo a passo para criar sua primeira aplicação com Next.js, React e TypeScript.',
   'video', 'https://youtube.com', true),
  ((SELECT id FROM public.content_categories WHERE slug = 'carreira'),
   'Como montar um portfólio que se destaca',
   'Dicas práticas para criar um portfólio de desenvolvedor que chama atenção dos recrutadores.',
   'article', NULL, true),
  ((SELECT id FROM public.content_categories WHERE slug = 'programacao'),
   'Guia de automações com RPA',
   'Material em PDF sobre como automatizar processos repetitivos usando ferramentas de RPA.',
   'pdf', NULL, true)
) AS v(category_id, title, description, content_type, url, is_published)
WHERE NOT EXISTS (SELECT 1 FROM public.content_items LIMIT 1);
