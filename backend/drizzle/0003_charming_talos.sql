ALTER TABLE "access" ALTER COLUMN "token_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();