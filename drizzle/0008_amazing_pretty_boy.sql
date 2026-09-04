CREATE TABLE "booking_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"show_seat_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_seats_booking_show_seat_unique" UNIQUE("booking_id","show_seat_id")
);
--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_show_seat_id_show_seats_id_fk" FOREIGN KEY ("show_seat_id") REFERENCES "public"."show_seats"("id") ON DELETE no action ON UPDATE no action;