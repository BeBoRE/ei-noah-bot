CREATE TABLE IF NOT EXISTS "key" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(15) NOT NULL,
	"hashed_password" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(15) NOT NULL,
	"active_expires" bigint NOT NULL,
	"idle_expires" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_role" DROP CONSTRAINT "custom_role_owner_id_foreign";
--> statement-breakpoint
ALTER TABLE "custom_role" DROP CONSTRAINT "custom_role_guild_id_foreign";
--> statement-breakpoint
ALTER TABLE "guild_user" DROP CONSTRAINT "guild_user_guild_id_foreign";
--> statement-breakpoint
ALTER TABLE "guild_user" DROP CONSTRAINT "guild_user_user_id_foreign";
--> statement-breakpoint
ALTER TABLE "lobby_name_change" DROP CONSTRAINT "lobby_name_change_guild_user_id_foreign";
--> statement-breakpoint
ALTER TABLE "quote" DROP CONSTRAINT "quote_guild_user_id_foreign";
--> statement-breakpoint
ALTER TABLE "quote" DROP CONSTRAINT "quote_creator_id_foreign";
--> statement-breakpoint
ALTER TABLE "temp_channel" DROP CONSTRAINT "temp_channel_guild_user_id_foreign";
--> statement-breakpoint
ALTER TABLE "mikro_orm_migrations" ALTER COLUMN "executed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "custom_role" ALTER COLUMN "expire_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lobby_name_change" ALTER COLUMN "date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote" ALTER COLUMN "date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "temp_channel" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "birthday" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_role" ADD CONSTRAINT "custom_role_owner_id_guild_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "guild_user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_role" ADD CONSTRAINT "custom_role_guild_id_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_user" ADD CONSTRAINT "guild_user_guild_id_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_user" ADD CONSTRAINT "guild_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lobby_name_change" ADD CONSTRAINT "lobby_name_change_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote" ADD CONSTRAINT "quote_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote" ADD CONSTRAINT "quote_creator_id_guild_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "guild_user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "temp_channel" ADD CONSTRAINT "temp_channel_guild_user_id_guild_user_id_fk" FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "key" ADD CONSTRAINT "key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
