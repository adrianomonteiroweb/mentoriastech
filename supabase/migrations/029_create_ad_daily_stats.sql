-- Tabela de estatísticas diárias de anúncios
-- Permite consultar views/cliques por dia, semana, mês e ano.
CREATE TABLE public.ad_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (ad_id, stat_date)
);

CREATE INDEX idx_ad_daily_stats_date ON public.ad_daily_stats (stat_date);
CREATE INDEX idx_ad_daily_stats_ad_date ON public.ad_daily_stats (ad_id, stat_date);

ALTER TABLE public.ad_daily_stats ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode inserir/atualizar (endpoint público de tracking)
CREATE POLICY "ad_daily_stats_public_upsert"
  ON public.ad_daily_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin pode ler tudo
CREATE POLICY "ad_daily_stats_admin_select"
  ON public.ad_daily_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
