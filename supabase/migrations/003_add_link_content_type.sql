-- Migration: permitir conteudos do tipo link
-- Execute no Supabase SQL Editor se o banco atual ainda tiver o CHECK antigo.

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_content_type_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_content_type_check
  CHECK (content_type IN ('pdf', 'article', 'video', 'link'));
