ALTER TABLE "session" ADD COLUMN "expo_push_token" varchar(255);--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "expo_push_token";