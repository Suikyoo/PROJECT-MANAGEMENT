ALTER TABLE "issues" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "resolutions" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;