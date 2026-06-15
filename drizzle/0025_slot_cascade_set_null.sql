ALTER TABLE "bookings" DROP CONSTRAINT "bookings_slot_id_mentoring_slots_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_mentoring_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."mentoring_slots"("id") ON DELETE set null ON UPDATE no action;
