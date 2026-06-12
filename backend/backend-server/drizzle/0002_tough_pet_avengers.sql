CREATE TABLE "access" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"project_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"dateIssued" timestamp (6) DEFAULT now() NOT NULL,
	"expiry" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" RENAME TO "feedback";--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "comments_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "access" ADD CONSTRAINT "access_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access" ADD CONSTRAINT "access_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;