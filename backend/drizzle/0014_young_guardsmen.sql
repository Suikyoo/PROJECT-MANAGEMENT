CREATE TABLE "issue_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"user_id" integer,
	"token_id" uuid,
	"author_name" text,
	"action" text NOT NULL,
	"message" text,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resolution_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resolution_id" integer NOT NULL,
	"user_id" integer,
	"token_id" uuid,
	"author_name" text,
	"action" text NOT NULL,
	"message" text,
	"createdAt" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_comments" DROP CONSTRAINT "issue_comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "phase_comments" DROP CONSTRAINT "phase_comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_transactions" ADD CONSTRAINT "issue_transactions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transactions" ADD CONSTRAINT "issue_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transactions" ADD CONSTRAINT "issue_transactions_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_transactions" ADD CONSTRAINT "resolution_transactions_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_transactions" ADD CONSTRAINT "resolution_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_transactions" ADD CONSTRAINT "resolution_transactions_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;