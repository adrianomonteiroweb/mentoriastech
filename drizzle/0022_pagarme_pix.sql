ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pagarme_order_id TEXT,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS pagarme_status TEXT;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_pagarme_charge_id_unique'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_pagarme_charge_id_unique UNIQUE (pagarme_charge_id);
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payments_pagarme_order
  ON public.payments(pagarme_order_id);
