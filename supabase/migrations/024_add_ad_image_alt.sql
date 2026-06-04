-- Texto alternativo configuravel para tornar artes de anuncios acessiveis.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS image_alt TEXT;

UPDATE public.ads
SET image_alt = title
WHERE image_url IS NOT NULL
  AND image_alt IS NULL;
