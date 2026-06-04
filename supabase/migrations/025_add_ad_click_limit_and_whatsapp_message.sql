-- Limite de cliques e mensagem inicial configuravel para links de WhatsApp.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS max_clicks INTEGER,
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT NOT NULL
    DEFAULT 'Olá, gostaria de saber mais sobre seu trabalho';

ALTER TABLE public.ads
  DROP CONSTRAINT IF EXISTS ads_max_clicks_positive;

ALTER TABLE public.ads
  ADD CONSTRAINT ads_max_clicks_positive
  CHECK (max_clicks IS NULL OR max_clicks > 0);
