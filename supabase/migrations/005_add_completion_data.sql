-- Migration: dados estruturados de conclusao de mentoria
-- Adiciona campos no profile do mentorado (permanentes) e no booking (por sessao).
-- Execute no Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_status TEXT,
  ADD COLUMN IF NOT EXISTS seniority TEXT,
  ADD COLUMN IF NOT EXISTS career_focus TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS topics_discussed TEXT,
  ADD COLUMN IF NOT EXISTS mentee_strengths TEXT,
  ADD COLUMN IF NOT EXISTS mentee_growth_areas TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
