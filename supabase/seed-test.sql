-- =============================================================================
-- Seed de Teste — Dados para testes manuais da plataforma
-- Execute APÓS o schema.sql principal
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- IMPORTANTE: Os UUIDs abaixo são fictícios. Para testes com auth real,
-- crie os usuários via Supabase Dashboard > Authentication > Users e use
-- os UUIDs gerados para atualizar os profiles abaixo.

-- -----------------------------------------------------------------------------
-- 1. Slots pagos com RRule (recorrência)
-- -----------------------------------------------------------------------------
-- Mentorias pagas: Segunda, Quarta, Sexta às 14:00
INSERT INTO public.mentoring_slots (start_time, slot_type, rrule, recurrence_start, recurrence_end) VALUES
  ('14:00', 'paid', 'FREQ=WEEKLY;BYDAY=MO,WE,FR', '2026-01-01', NULL);

-- Mentorias pagas: Terça e Quinta às 10:00
INSERT INTO public.mentoring_slots (start_time, slot_type, rrule, recurrence_start, recurrence_end) VALUES
  ('10:00', 'paid', 'FREQ=WEEKLY;BYDAY=TU,TH', '2026-01-01', NULL);

-- Mentoria particular: Sábado às 16:00
INSERT INTO public.mentoring_slots (start_time, slot_type, rrule, recurrence_start, recurrence_end) VALUES
  ('16:00', 'private', 'FREQ=WEEKLY;BYDAY=SA', '2026-01-01', NULL);

-- -----------------------------------------------------------------------------
-- 2. Topics pagos (complementam os já inseridos pelo schema.sql)
-- -----------------------------------------------------------------------------
-- Os topics pagos já existem no schema.sql principal.
-- Se precisar de mais, adicione aqui:
-- INSERT INTO public.mentoring_topics (name, category, sort_order) VALUES
--   ('Outro tema pago', 'paid', 11);

-- -----------------------------------------------------------------------------
-- 3. Bookings de exemplo (sem mentee_id — bookings de convidados)
-- -----------------------------------------------------------------------------
-- Booking gratuito: confirmado
INSERT INTO public.bookings (
  guest_name, guest_email, guest_whatsapp,
  topic_id, session_date, start_time,
  booking_type, status, notes
) VALUES (
  'Maria Teste', 'maria@teste.com', '5585999990001',
  (SELECT id FROM public.mentoring_topics WHERE name = 'Carreira em programação' LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days',
  '20:00:00',
  'free', 'confirmed',
  'Booking de teste — gratuito confirmado'
);

-- Booking gratuito: pendente
INSERT INTO public.bookings (
  guest_name, guest_email, guest_whatsapp,
  topic_id, session_date, start_time,
  booking_type, status, notes
) VALUES (
  'João Teste', 'joao@teste.com', '5585999990002',
  (SELECT id FROM public.mentoring_topics WHERE name = 'Preparação para entrevistas' LIMIT 1),
  CURRENT_DATE + INTERVAL '5 days',
  '09:00:00',
  'free', 'pending',
  'Booking de teste — gratuito pendente'
);

-- Booking pago: pago
INSERT INTO public.bookings (
  guest_name, guest_email, guest_whatsapp,
  topic_id, session_date, start_time,
  booking_type, status, notes
) VALUES (
  'Ana Teste', 'ana@teste.com', '5585999990003',
  (SELECT id FROM public.mentoring_topics WHERE name = 'Aulas de Next.js' LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days',
  '14:00:00',
  'paid', 'paid',
  'Booking de teste — pago confirmado'
);

-- Booking pago: completado
INSERT INTO public.bookings (
  guest_name, guest_email, guest_whatsapp,
  topic_id, session_date, start_time,
  booking_type, status, notes
) VALUES (
  'Carlos Teste', 'carlos@teste.com', '5585999990004',
  (SELECT id FROM public.mentoring_topics WHERE name = 'Projetos pessoais' LIMIT 1),
  CURRENT_DATE - INTERVAL '3 days',
  '10:00:00',
  'paid', 'completed',
  'Booking de teste — pago completado'
);

-- -----------------------------------------------------------------------------
-- 4. Pagamento de exemplo (para o booking pago)
-- -----------------------------------------------------------------------------
INSERT INTO public.payments (
  booking_id, amount_cents, currency, method, status, pix_txid, paid_at
) VALUES (
  (SELECT id FROM public.bookings WHERE guest_name = 'Ana Teste' LIMIT 1),
  5000, 'brl', 'pix', 'confirmed', 'pi_test_example_123', now() - INTERVAL '1 day'
);

-- -----------------------------------------------------------------------------
-- 5. Vaga de exemplo (aprovada)
-- -----------------------------------------------------------------------------
INSERT INTO public.jobs (
  title, company, description, location, job_type,
  salary_range, application_url, status
) VALUES (
  'Desenvolvedor Frontend React',
  'Tech Solutions Ltda',
  'Vaga para desenvolvedor frontend com experiência em React, TypeScript e Next.js. Trabalho remoto com reuniões semanais.',
  'Remoto (Brasil)',
  'remote',
  'R$ 8.000 - R$ 12.000',
  'https://example.com/vaga-frontend',
  'approved'
);

INSERT INTO public.jobs (
  title, company, description, location, job_type,
  salary_range, application_url, status
) VALUES (
  'Analista de Dados Junior',
  'DataCorp',
  'Oportunidade para analista de dados com conhecimento em SQL e Python. Híbrido em Fortaleza.',
  'Fortaleza, CE',
  'hybrid',
  'R$ 4.000 - R$ 6.000',
  'https://example.com/vaga-dados',
  'approved'
);

-- Vaga pendente (para testar aprovação no admin)
INSERT INTO public.jobs (
  title, company, description, location, job_type,
  salary_range, application_url, status
) VALUES (
  'Estagiário Full Stack',
  'StartupXYZ',
  'Estágio para desenvolvedor full stack. Aprendizado prático com mentoria inclusa.',
  'São Paulo, SP',
  'onsite',
  'R$ 1.800 - R$ 2.500',
  'https://example.com/vaga-estagio',
  'pending'
);

-- -----------------------------------------------------------------------------
-- 6. Categoria e conteúdo de exemplo
-- -----------------------------------------------------------------------------
INSERT INTO public.content_categories (name, slug, description, sort_order) VALUES
  ('Carreira', 'carreira', 'Artigos e materiais sobre carreira em tecnologia', 1),
  ('Programação', 'programacao', 'Tutoriais e materiais técnicos', 2);

INSERT INTO public.content_items (
  category_id, title, description, content_type, article_body, is_published
) VALUES (
  (SELECT id FROM public.content_categories WHERE slug = 'carreira' LIMIT 1),
  'Como se preparar para entrevistas técnicas',
  'Guia completo com dicas para entrevistas em empresas de tecnologia',
  'article',
  '# Como se preparar para entrevistas técnicas

## 1. Estude estruturas de dados
Listas, filas, pilhas, árvores e grafos são fundamentais.

## 2. Pratique algoritmos
Use plataformas como LeetCode e HackerRank.

## 3. Prepare-se para perguntas comportamentais
Use o método STAR (Situação, Tarefa, Ação, Resultado).

## 4. Conheça a empresa
Pesquise sobre a cultura, produtos e tecnologias utilizadas.',
  true
);

INSERT INTO public.content_items (
  category_id, title, description, content_type, url, is_published
) VALUES (
  (SELECT id FROM public.content_categories WHERE slug = 'programacao' LIMIT 1),
  'Introdução ao Next.js',
  'Vídeo tutorial sobre os fundamentos do Next.js App Router',
  'video',
  'https://www.youtube.com/watch?v=example',
  true
);

-- -----------------------------------------------------------------------------
-- 7. Configuração PIX atualizada
-- -----------------------------------------------------------------------------
UPDATE public.site_settings
SET value = '{"key": "03440795381", "name": "Adriano Monteiro", "city": "Fortaleza", "type": "cpf"}'
WHERE key = 'pix_config';
