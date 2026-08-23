-- Migration 030: Tracking links (UTM) + UTM columns em page_events
-- Sistema de links rastreáveis para campanhas (Instagram, LinkedIn, eventos, etc.)

-- 1. Adicionar colunas UTM à tabela page_events existente
ALTER TABLE public.page_events
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

CREATE INDEX IF NOT EXISTS idx_page_events_utm_source ON public.page_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_events_utm_campaign ON public.page_events(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_events_created_at ON public.page_events(created_at);

-- 2. Tabela de links de rastreamento (gerenciada pelo admin)
CREATE TABLE IF NOT EXISTS public.tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- nome descritivo (ex: "Instagram Stories - Evento X")
  utm_source TEXT NOT NULL,          -- ex: instagram, linkedin, google, whatsapp
  utm_medium TEXT NOT NULL,          -- ex: social, organic, cpc, email, referral
  utm_campaign TEXT,                 -- ex: evento-xyz, curso-react-2025
  destination_path TEXT NOT NULL DEFAULT '/', -- página de destino (ex: /, /jobs, /content)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_active ON public.tracking_links(is_active) WHERE is_active = true;
