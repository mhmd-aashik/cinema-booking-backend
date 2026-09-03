CREATE TABLE "screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cinema_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"screen_type" varchar(50),
	"total_seats" integer NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screens_cinema_name_unique" UNIQUE("cinema_id","name")
);
--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_cinema_id_cinemas_id_fk" FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id") ON DELETE no action ON UPDATE no action;