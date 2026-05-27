CREATE TABLE IF NOT EXISTS "booking_history_sync_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL,
  "requested_by" uuid,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "error" text,
  "client_created_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "booking_history_sync_queue_status_check"
    CHECK ("status" IN ('pending', 'processed', 'failed'))
);--> statement-breakpoint
ALTER TABLE "booking_history_sync_queue"
  ADD CONSTRAINT "booking_history_sync_queue_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "booking_history_sync_queue"
  ADD CONSTRAINT "booking_history_sync_queue_requested_by_profiles_id_fk"
  FOREIGN KEY ("requested_by") REFERENCES "profiles"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_booking_history_sync_queue_booking"
  ON "booking_history_sync_queue" ("booking_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_booking_history_sync_queue_status"
  ON "booking_history_sync_queue" ("status", "created_at");
