CREATE TABLE "phase_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phase_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	CONSTRAINT "phase_logs_phase_id_unique" UNIQUE("phase_id")
);
--> statement-breakpoint
ALTER TABLE "feedback" RENAME TO "project_feedback";--> statement-breakpoint
ALTER TABLE "logs" RENAME TO "project_logs";--> statement-breakpoint
ALTER TABLE "project_feedback" RENAME COLUMN "phase_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "project_logs" DROP CONSTRAINT "logs_project_id_unique";--> statement-breakpoint
ALTER TABLE "project_feedback" DROP CONSTRAINT "feedback_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "project_feedback" DROP CONSTRAINT "feedback_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_logs" DROP CONSTRAINT "logs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "expiry" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "phase_feedback" ADD CONSTRAINT "phase_feedback_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_feedback" ADD CONSTRAINT "phase_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_logs" ADD CONSTRAINT "phase_logs_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_feedback" ADD CONSTRAINT "project_feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_feedback" ADD CONSTRAINT "project_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_project_id_unique" UNIQUE("project_id");