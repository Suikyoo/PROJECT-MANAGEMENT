ALTER TABLE "issues" DROP CONSTRAINT "issues_resolution_id_resolutions_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "resolution_id";