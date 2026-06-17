CREATE TABLE "otp_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp" text NOT NULL,
	"expires_at" timestamp (6) NOT NULL,
	"used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "username" TO "email";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";