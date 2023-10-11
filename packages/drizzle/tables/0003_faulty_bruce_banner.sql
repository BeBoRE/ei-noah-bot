CREATE TABLE IF NOT EXISTS "login_token" (
	"token" varchar(72) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "login_token" ADD CONSTRAINT "login_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
