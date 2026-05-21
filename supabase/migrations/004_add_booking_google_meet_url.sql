-- Migration: armazenar o link do Google Meet criado para a mentoria
-- Execute no Supabase SQL Editor se o banco atual ainda nao tiver esta coluna.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS google_meet_url TEXT;
