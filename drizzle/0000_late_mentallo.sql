CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"release_date" date,
	"rating" varchar(20),
	"language" varchar(50),
	"poster_url" text,
	"trailer_url" text,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
