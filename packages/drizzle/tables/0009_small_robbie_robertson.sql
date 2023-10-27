CREATE TABLE IF NOT EXISTS "non_approved_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(99) NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" integer,
	"approved_role_id" varchar(255) NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" integer,
	CONSTRAINT "non_approved_role_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_approved_role" ADD CONSTRAINT "non_approved_role_guild_id_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_approved_role" ADD CONSTRAINT "non_approved_role_created_by_guild_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "guild_user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_approved_role" ADD CONSTRAINT "non_approved_role_approved_role_id_role_id_fk" FOREIGN KEY ("approved_role_id") REFERENCES "role"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_approved_role" ADD CONSTRAINT "non_approved_role_approved_by_guild_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "guild_user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
