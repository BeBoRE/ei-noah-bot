ALTER TABLE "key" DROP CONSTRAINT "key_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "lobby_name_change" DROP CONSTRAINT "lobby_name_change_guild_user_id_guild_user_id_fk";
--> statement-breakpoint
ALTER TABLE "login_token" DROP CONSTRAINT "login_token_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "temp_channel" DROP CONSTRAINT "temp_channel_guild_user_id_guild_user_id_fk";
--> statement-breakpoint
ALTER TABLE "temp_channel" ALTER COLUMN "guild_user_id" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "key" ADD CONSTRAINT "key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lobby_name_change" ADD CONSTRAINT "lobby_name_change_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "login_token" ADD CONSTRAINT "login_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "temp_channel" ADD CONSTRAINT "temp_channel_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
