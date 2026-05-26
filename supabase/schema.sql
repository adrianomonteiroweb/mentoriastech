-- =============================================================================
-- Schema completo da Plataforma de Mentoria — Adriano Monteiro
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES — Perfis de usuário (vinculado a auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentee', 'hr')),
  full_name TEXT,
  email TEXT,
  whatsapp TEXT,
  linkedin_url TEXT,
  bio TEXT,
  resume_url TEXT,
  avatar_url TEXT,
  career_status TEXT,         -- 'seeking' | 'interning' | 'employed' | 'student' | 'other'
  seniority TEXT,             -- 'junior' | 'mid' | 'senior' | 'undefined'
  career_focus TEXT,          -- Foco de carreira (texto livre)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler seu próprio perfil
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin pode ler todos os perfis
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- HR pode ler perfis de mentorados
CREATE POLICY "HR can read mentee profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'hr'
    )
  );

-- Usuários podem atualizar seu próprio perfil (exceto role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin pode atualizar qualquer perfil
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger para criar perfil automaticamente ao signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 2. MENTORING_SLOTS — Horários disponíveis para mentoria
-- -----------------------------------------------------------------------------
CREATE TABLE public.mentoring_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, nullable para slots com rrule
  start_time TIME NOT NULL,
  slot_type TEXT NOT NULL DEFAULT 'free' CHECK (slot_type IN ('free', 'paid', 'private')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  rrule TEXT,                    -- Ex: "FREQ=WEEKLY;BYDAY=MO,WE"
  recurrence_start DATE,         -- Data de início da recorrência
  recurrence_end DATE,           -- Data de fim da recorrência (opcional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentoring_slots ENABLE ROW LEVEL SECURITY;

-- Todos podem ler slots ativos
CREATE POLICY "Anyone can read active slots"
  ON public.mentoring_slots FOR SELECT
  USING (true);

-- Apenas admin pode gerenciar slots
CREATE POLICY "Admin can manage slots"
  ON public.mentoring_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 3. MENTORING_TOPICS — Temas de mentoria
-- -----------------------------------------------------------------------------
CREATE TABLE public.mentoring_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'free' CHECK (category IN ('free', 'paid')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentoring_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active topics"
  ON public.mentoring_topics FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage topics"
  ON public.mentoring_topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. BOOKINGS — Agendamentos de mentoria
-- -----------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Mentorado autenticado (nullable para bookings de visitantes)
  mentee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Campos para visitantes não autenticados
  guest_name TEXT,
  guest_email TEXT,
  guest_whatsapp TEXT,
  -- Referências
  slot_id UUID REFERENCES public.mentoring_slots(id),
  topic_id UUID REFERENCES public.mentoring_topics(id),
  -- Dados da sessão
  session_date DATE,
  start_time TIME,
  booking_type TEXT NOT NULL DEFAULT 'free' CHECK (booking_type IN ('free', 'paid', 'private')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'payment_pending', 'paid', 'scheduled', 'completed', 'cancelled')
  ),
  notes TEXT,
  google_event_id TEXT,
  google_meet_url TEXT,
  topics_discussed TEXT,        -- Duvidas/temas abordados na sessao
  mentee_strengths TEXT,        -- Pontos positivos do mentorado
  mentee_growth_areas TEXT,     -- Pontos a desenvolver
  admin_notes TEXT,             -- Anotacoes privadas do admin sobre o candidato
  mentorship_checklist JSONB,    -- Snapshot dos itens marcados na sessao
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Visitantes podem inserir bookings (formulário público)
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

-- Mentorados veem seus próprios bookings
CREATE POLICY "Mentees can read own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = mentee_id);

-- Admin vê e gerencia todos os bookings
CREATE POLICY "Admin can manage all bookings"
  ON public.bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Leitura pública limitada para schedule (apenas data, hora e topic — sem dados pessoais)
-- Implementada via API route com service role key, não via RLS

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 5. PAYMENTS — Pagamentos de mentorias pagas
-- -----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'failed', 'refunded')
  ),
  pix_txid TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Mentorado vê seus próprios pagamentos
CREATE POLICY "Mentees can read own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.mentee_id = auth.uid()
    )
  );

-- Admin gerencia todos os pagamentos
CREATE POLICY "Admin can manage all payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 6. CONTENT_CATEGORIES — Categorias de conteúdo
-- -----------------------------------------------------------------------------
CREATE TABLE public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON public.content_categories FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.content_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 7. CONTENT_ITEMS — Itens de conteúdo (PDFs, artigos, vídeos e links)
-- -----------------------------------------------------------------------------
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('pdf', 'article', 'video', 'link')),
  url TEXT,
  links JSONB,
  article_body TEXT,
  file_size_bytes INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Autenticados podem ler conteúdos publicados
CREATE POLICY "Authenticated users can read published content"
  ON public.content_items FOR SELECT
  USING (auth.role() = 'authenticated' AND is_published = true);

-- Admin gerencia todos os conteúdos
CREATE POLICY "Admin can manage all content"
  ON public.content_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 8. JOBS — Quadro de vagas
-- -----------------------------------------------------------------------------
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  job_type TEXT NOT NULL DEFAULT 'remote' CHECK (job_type IN ('remote', 'hybrid', 'onsite')),
  level TEXT NOT NULL DEFAULT 'junior' CHECK (level IN ('internship', 'junior', 'mid', 'senior')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('dados', 'ia', 'desenvolvimento', 'po', 'pm', 'qa', 'cyber_security', 'devops', 'design', 'pcd', 'afirmativa_pessoas_pretas', 'afirmativa_mulheres_tecnologia', 'other')),
  salary_range TEXT,
  application_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  ),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Todos podem ler vagas aprovadas
CREATE POLICY "Anyone can read approved jobs"
  ON public.jobs FOR SELECT
  USING (status = 'approved');

-- Usuários veem suas próprias vagas (qualquer status)
CREATE POLICY "Users can read own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = posted_by);

-- Autenticados podem criar vagas
CREATE POLICY "Authenticated users can create jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Usuários podem atualizar suas próprias vagas pendentes
CREATE POLICY "Users can update own pending jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = posted_by AND status = 'pending')
  WITH CHECK (auth.uid() = posted_by);

-- Admin gerencia todas as vagas
CREATE POLICY "Admin can manage all jobs"
  ON public.jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 9. SITE_SETTINGS — Configurações globais (PIX, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Todos podem ler configurações
CREATE POLICY "Anyone can read settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Admin gerencia configurações
CREATE POLICY "Admin can manage settings"
  ON public.site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- PAGE_SHARES — Contadores de compartilhamento para páginas públicas
-- -----------------------------------------------------------------------------
CREATE TABLE public.page_shares (
  path TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  share_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read page shares"
  ON public.page_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage page shares"
  ON public.page_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- ADS — Anúncios de serviços indicados pelo admin
-- -----------------------------------------------------------------------------
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  whatsapp_number TEXT,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ads"
  ON public.ads FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage all ads"
  ON public.ads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- SEED DATA — Dados iniciais
-- =============================================================================

-- Slots iniciais
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

-- Topics iniciais (valores atualmente hardcoded em booking-form.tsx e mentoring-info.tsx)
INSERT INTO public.mentoring_topics (name, category, sort_order) VALUES
  ('Programação para outras profissões', 'free', 1),
  ('Carreira em programação', 'free', 2),
  ('Preparação para entrevistas', 'free', 3),
  ('Busca de oportunidades', 'free', 4),
  ('Desenvolvimento Web', 'free', 5),
  ('Automações RPA', 'free', 6),
  ('Acompanhamento de processo seletivo', 'paid', 7),
  ('Projetos pessoais', 'paid', 8),
  ('Aulas de RPA', 'paid', 9),
  ('Aulas de Next.js', 'paid', 10);

-- Configuração inicial do PIX (atualizar com a chave real do admin)
INSERT INTO public.site_settings (key, value) VALUES
  ('pix_config', '{"key": "", "name": "Adriano Monteiro", "city": "Fortaleza", "type": "email"}');

-- Categorias de conteúdo
-- Checklist inicial de mentoria
INSERT INTO public.site_settings (key, value) VALUES
  ('mentorship_checklist', '[
    { "id": "explicacao-sobre-a-mentoria", "label": "Explicacao sobre a mentoria" },
    { "id": "apresentacao-do-mentorado", "label": "Apresentacao do mentorado" },
    { "id": "duvidas-sobre-a-trajetoria-e-dicas", "label": "Duvidas sobre a trajetoria e dicas" },
    { "id": "posicionamento-linkedin", "label": "Posicionamento: LinkedIn" },
    { "id": "posicionamento-curriculo", "label": "Posicionamento: curriculo" },
    { "id": "posicionamento-projetos-de-portfolio", "label": "Posicionamento: projetos de portfolio" }
  ]'::jsonb);

INSERT INTO public.content_categories (name, slug, description, sort_order) VALUES
  ('Carreira', 'carreira', 'Dicas e guias sobre carreira em tecnologia', 1),
  ('Programação', 'programacao', 'Tutoriais e materiais sobre programação', 2),
  ('Entrevistas', 'entrevistas', 'Preparação para processos seletivos', 3);

-- Conteúdos iniciais
INSERT INTO public.content_items (category_id, title, description, content_type, url, is_published) VALUES
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
   'pdf', NULL, true);

-- =============================================================================
-- INDEXES — Índices para performance
-- =============================================================================
CREATE INDEX idx_bookings_mentee_id ON public.bookings(mentee_id);
CREATE INDEX idx_bookings_session_date ON public.bookings(session_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_content_items_category ON public.content_items(category_id);
CREATE INDEX idx_content_items_published ON public.content_items(is_published);
CREATE INDEX idx_content_items_share_count ON public.content_items(share_count DESC);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_posted_by ON public.jobs(posted_by);
CREATE INDEX idx_jobs_share_count ON public.jobs(share_count DESC);

-- -----------------------------------------------------------------------------
-- 10. CONTENT_VIEWS — Rastreamento de visitantes únicos por conteúdo
-- -----------------------------------------------------------------------------
CREATE TABLE public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, visitor_hash)
);

CREATE INDEX idx_content_views_content_id ON public.content_views(content_id);
CREATE INDEX idx_content_items_view_count ON public.content_items(view_count DESC);

-- -----------------------------------------------------------------------------
-- 11. JOB_ACTIONS — Ações de mentorados em vagas
-- -----------------------------------------------------------------------------
CREATE TABLE public.job_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,  -- 'applied', 'link_issue', 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id, action_type)
);

CREATE INDEX idx_job_actions_job_id ON public.job_actions(job_id);
CREATE INDEX idx_job_actions_user_id ON public.job_actions(user_id);
