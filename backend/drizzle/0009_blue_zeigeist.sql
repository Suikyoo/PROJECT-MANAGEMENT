CREATE TABLE "forget_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp (6) NOT NULL,
	"used" boolean DEFAULT false NOT NULL
);
