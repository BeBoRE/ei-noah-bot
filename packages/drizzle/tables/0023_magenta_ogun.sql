CREATE TABLE IF NOT EXISTS "recently_added_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"owning_guild_user_id" integer NOT NULL,
	"added_guild_user_id" integer NOT NULL,
	"date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recently_added_user" ADD CONSTRAINT "recently_added_user_owning_guild_user_id_guild_user_id_fk" FOREIGN KEY ("owning_guild_user_id") REFERENCES "guild_user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recently_added_user" ADD CONSTRAINT "recently_added_user_added_guild_user_id_guild_user_id_fk" FOREIGN KEY ("added_guild_user_id") REFERENCES "guild_user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
