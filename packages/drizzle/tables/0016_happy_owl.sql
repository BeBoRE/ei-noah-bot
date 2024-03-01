CREATE INDEX IF NOT EXISTS "temp_channel_guild_user_id_index" ON "temp_channel" ("guild_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_channel_created_at_index" ON "temp_channel" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_channel_name_index" ON "temp_channel" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_channel_guild_user_id_created_at_name_index" ON "temp_channel" ("guild_user_id","created_at","name");