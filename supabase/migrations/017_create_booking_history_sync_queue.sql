-- Migration: fila de sincronizacao offline-first para historico de mentorias.

CREATE TABLE IF NOT EXISTS public.booking_history_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error TEXT,
  client_created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_history_sync_queue_booking
  ON public.booking_history_sync_queue(booking_id, created_at);

CREATE INDEX IF NOT EXISTS idx_booking_history_sync_queue_status
  ON public.booking_history_sync_queue(status, created_at);

ALTER TABLE public.booking_history_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage booking history sync queue"
  ON public.booking_history_sync_queue;
CREATE POLICY "Service role can manage booking history sync queue"
  ON public.booking_history_sync_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_booking_history_sync_queue_updated_at
  ON public.booking_history_sync_queue;
CREATE TRIGGER update_booking_history_sync_queue_updated_at
  BEFORE UPDATE ON public.booking_history_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
