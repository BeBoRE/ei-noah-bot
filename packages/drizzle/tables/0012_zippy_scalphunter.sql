CREATE TABLE IF NOT EXISTS "birthday" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Migrate data from user.birthday to birthday
DO $$
DECLARE
	user_row RECORD;
BEGIN
	FOR user_row IN SELECT * FROM "user" WHERE "birthday" IS NOT NULL LOOP
		INSERT INTO "birthday" ("user_id", "date", "created_at") VALUES (user_row.id, user_row.birthday, now());
	END LOOP;
END $$;

--> statement-breakpoint
DROP INDEX IF EXISTS "user_birthday_index";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "birthday_user_id_index" ON "birthday" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "birthday_date_index" ON "birthday" ("date");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "birthday";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthday" ADD CONSTRAINT "birthday_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
