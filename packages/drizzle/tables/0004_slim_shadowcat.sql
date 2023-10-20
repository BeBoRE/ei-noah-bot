CREATE TABLE IF NOT EXISTS "role" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
DROP TABLE "custom_role";--> statement-breakpoint
ALTER TABLE "guild_user" DROP CONSTRAINT "guild_user_guild_id_guild_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_user" ADD CONSTRAINT "guild_user_guild_id_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role" ADD CONSTRAINT "role_guild_id_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role" ADD CONSTRAINT "role_created_by_guild_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "guild_user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
