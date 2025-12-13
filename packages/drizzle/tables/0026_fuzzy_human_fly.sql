TRUNCATE TABLE "session";
ALTER TABLE "session" ADD COLUMN "secret_hash" varchar(50) NOT NULL;
