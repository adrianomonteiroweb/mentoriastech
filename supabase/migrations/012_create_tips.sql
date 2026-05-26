-- Migration 012: dicas administráveis para as telas públicas de conteúdo e vagas

CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'both' CHECK (placement IN ('content', 'jobs', 'both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active tips" ON public.tips;
CREATE POLICY "Anyone can read active tips"
  ON public.tips FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage all tips" ON public.tips;
CREATE POLICY "Admin can manage all tips"
  ON public.tips FOR ALL
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

DROP TRIGGER IF EXISTS tips_updated_at ON public.tips;
CREATE TRIGGER tips_updated_at
  BEFORE UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tips_active_placement
  ON public.tips(is_active, placement);

INSERT INTO public.tips (title, body, placement, sort_order, is_active)
SELECT
  'Aumente sua rede no LinkedIn',
  'Quantas conexões você tem no LinkedIn? Quanto mais conexões, mais você terá chance de aparecer em buscas de recrutadores por se aproximar da rede de conexões deles.',
  'both',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tips
  WHERE body = 'Quantas conexões você tem no LinkedIn? Quanto mais conexões, mais você terá chance de aparecer em buscas de recrutadores por se aproximar da rede de conexões deles.'
);
