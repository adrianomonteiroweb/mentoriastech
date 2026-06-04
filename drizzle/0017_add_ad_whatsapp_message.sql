ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "max_clicks" integer;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "whatsapp_message" text DEFAULT 'Olá, gostaria de saber mais sobre seu trabalho' NOT NULL;
