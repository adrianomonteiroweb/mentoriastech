CREATE TABLE IF NOT EXISTS "booking_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"file_url" text,
	"file_name" text,
	"file_size_bytes" integer,
	"mime_type" text,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_attachments_booking_id_bookings_id_fk'
  ) THEN
    ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_attachments_uploaded_by_profiles_id_fk'
  ) THEN
    ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
