ALTER TABLE "quote" DROP CONSTRAINT "quote_guild_user_id_guild_user_id_fk";
--> statement-breakpoint
ALTER TABLE "quote" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote" ADD CONSTRAINT "quote_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "guild" DROP COLUMN IF EXISTS "seperate_text_channel";