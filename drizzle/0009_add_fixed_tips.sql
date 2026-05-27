ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "is_fixed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "tips"
SET "is_fixed" = true,
    "is_active" = true
WHERE "title" = 'Aumente sua rede no LinkedIn'
  AND "sort_order" = 1;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.prevent_fixed_tip_hiding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_fixed = true AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Dicas fixas nao podem ser ocultadas'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_fixed_tip_hiding ON public.tips;--> statement-breakpoint
CREATE TRIGGER prevent_fixed_tip_hiding
  BEFORE INSERT OR UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fixed_tip_hiding();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.prevent_fixed_tip_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_fixed = true THEN
    RAISE EXCEPTION 'Dicas fixas nao podem ser removidas'
      USING ERRCODE = '23514';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;--> statement-breakpoint
DROP TRIGGER IF EXISTS prevent_fixed_tip_delete ON public.tips;--> statement-breakpoint
CREATE TRIGGER prevent_fixed_tip_delete
  BEFORE DELETE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fixed_tip_delete();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tips_fixed_placement" ON "tips" ("is_fixed", "placement");
