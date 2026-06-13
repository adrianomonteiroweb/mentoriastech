CREATE TABLE IF NOT EXISTS public.paid_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  image_alt TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 50),
  currency TEXT NOT NULL DEFAULT 'BRL',
  pix_expires_after_seconds INTEGER NOT NULL DEFAULT 86400 CHECK (
    pix_expires_after_seconds BETWEEN 10 AND 1209600
  ),
  pix_amount_includes_iof TEXT NOT NULL DEFAULT 'never' CHECK (
    pix_amount_includes_iof IN ('always', 'never')
  ),
  mentor_email TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);--> statement-breakpoint
ALTER TABLE public.paid_mentorships ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Anyone can read active paid mentorships"
  ON public.paid_mentorships FOR SELECT
  USING (is_active = true);--> statement-breakpoint
CREATE POLICY "Admin can manage paid mentorships"
  ON public.paid_mentorships FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());--> statement-breakpoint
CREATE TRIGGER paid_mentorships_updated_at
  BEFORE UPDATE ON public.paid_mentorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();--> statement-breakpoint
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS paid_mentorship_id UUID REFERENCES public.paid_mentorships(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paid_mentorship_id UUID REFERENCES public.paid_mentorships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_status TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code_data TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code_image_url_png TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code_image_url_svg TEXT,
  ADD COLUMN IF NOT EXISTS pix_hosted_instructions_url TEXT,
  ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_stripe_payment_intent_id_unique'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_stripe_payment_intent_id_unique UNIQUE (stripe_payment_intent_id);
  END IF;
END $$;--> statement-breakpoint
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_paid_mentorships_active_order
  ON public.paid_mentorships(is_active, sort_order, created_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bookings_paid_mentorship
  ON public.bookings(paid_mentorship_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payments_paid_mentorship
  ON public.payments(paid_mentorship_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent
  ON public.payments(stripe_payment_intent_id);
