-- Add origin tracking metadata used when completing mentorship sessions.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS origin_category TEXT,
  ADD COLUMN IF NOT EXISTS origin_description TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS origin_category TEXT,
  ADD COLUMN IF NOT EXISTS origin_description TEXT;

COMMENT ON COLUMN public.profiles.origin_category IS 'Canal de origem do mentorado';
COMMENT ON COLUMN public.profiles.origin_description IS 'Descricao complementar da origem do mentorado';
COMMENT ON COLUMN public.bookings.origin_category IS 'Canal de origem registrado no fechamento da mentoria';
COMMENT ON COLUMN public.bookings.origin_description IS 'Descricao complementar da origem registrada no fechamento da mentoria';
