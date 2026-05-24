-- Adicionar contadores de visualização e cliques nos anúncios
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

-- Adicionar contadores de visualização e cliques nas vagas
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;
