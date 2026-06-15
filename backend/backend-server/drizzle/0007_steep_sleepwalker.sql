ALTER TABLE "phase_feedback" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_feedback" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "phase_feedback" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "project_feedback" ADD COLUMN "author_name" text;