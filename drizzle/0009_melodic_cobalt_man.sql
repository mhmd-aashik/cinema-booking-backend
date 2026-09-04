CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" varchar(30) DEFAULT 'STRIPE' NOT NULL,
	"provider_payment_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'AED' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;