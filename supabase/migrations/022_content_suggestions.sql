-- Migration 022: solicitacoes e indicacoes de conteudo (caixa de entrada do admin)
-- Submissoes publicas (qualquer pessoa). Nao viram conteudo publicado automaticamente.

CREATE TABLE IF NOT EXISTS public.content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- null = anonimo
  type TEXT NOT NULL CHECK (type IN ('request', 'indication')),
  title TEXT,
  url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create content suggestions"
  ON public.content_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can manage content suggestions"
  ON public.content_suggestions FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE INDEX IF NOT EXISTS idx_content_suggestions_status
  ON public.content_suggestions(status, created_at);

CREATE TRIGGER content_suggestions_updated_at
  BEFORE UPDATE ON public.content_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
