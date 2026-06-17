CREATE TABLE "issue_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"user_id" integer,
	"author_name" text,
	"content" text NOT NULL,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"proof" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"resolution_id" integer,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"name" text NOT NULL,
	"tag_type_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resolutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"proof" text,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "phase_feedback" RENAME TO "phase_comments";--> statement-breakpoint
ALTER TABLE "project_feedback" RENAME TO "project_comments";--> statement-breakpoint
ALTER TABLE "phase_comments" DROP CONSTRAINT "phase_feedback_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "phase_comments" DROP CONSTRAINT "phase_feedback_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_comments" DROP CONSTRAINT "project_feedback_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_comments" DROP CONSTRAINT "project_feedback_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_tags" ADD CONSTRAINT "issue_tags_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_tags" ADD CONSTRAINT "issue_tags_tag_type_id_tag_types_id_fk" FOREIGN KEY ("tag_type_id") REFERENCES "public"."tag_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_comments" ADD CONSTRAINT "phase_comments_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_comments" ADD CONSTRAINT "phase_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;