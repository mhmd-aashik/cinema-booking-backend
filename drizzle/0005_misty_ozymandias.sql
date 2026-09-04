CREATE TABLE "show_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"status" varchar(30) DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "show_seats_show_seat_unique" UNIQUE("show_id","seat_id")
);
--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE no action ON UPDATE no action;