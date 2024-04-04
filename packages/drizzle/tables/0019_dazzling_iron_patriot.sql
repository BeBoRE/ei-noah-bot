ALTER TABLE "quote" DROP CONSTRAINT "quote_creator_id_guild_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote" ADD CONSTRAINT "quote_creator_id_guild_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "guild_user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
