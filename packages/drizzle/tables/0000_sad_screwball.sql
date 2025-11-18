-- =====================================
-- DATABASE SCHEMA GENERATED FROM SNAPSHOT
-- =====================================

-- Table: mikro_orm_migrations
CREATE TABLE "mikro_orm_migrations" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255),
    "executed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: channel
CREATE TABLE "channel" (
    "id" VARCHAR(255) PRIMARY KEY
);

-- Table: guild
CREATE TABLE "guild" (
    "id" VARCHAR(255) PRIMARY KEY,
    "bitrate" INTEGER NOT NULL DEFAULT 96000,
    "birthday_channel" VARCHAR(255),
    "birthday_role" VARCHAR(255),
    "role_menu_id" VARCHAR(255),
    "default_color" VARCHAR(255),
    "required_role" VARCHAR(255),
    "category" VARCHAR(255),
    "language" VARCHAR(255),
    "seperate_text_channel" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: user
CREATE TABLE "user" (
    "id" VARCHAR(255) PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "birthday" TIMESTAMP(0) WITH TIME ZONE,
    "language" VARCHAR(255),
    "timezone" VARCHAR(255),
    "expo_push_token" VARCHAR(255)
);

CREATE INDEX "user_birthday_index" ON "user" ("birthday");

-- Table: guild_user
CREATE TABLE "guild_user" (
    "id" SERIAL PRIMARY KEY,
    "guild_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "birthday_msg" VARCHAR(20),

    CONSTRAINT "guild_user_guild_id_user_id_unique"
        UNIQUE ("guild_id", "user_id"),

    CONSTRAINT "guild_user_guild_id_foreign"
        FOREIGN KEY ("guild_id") REFERENCES "guild"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION,

    CONSTRAINT "guild_user_user_id_foreign"
        FOREIGN KEY ("user_id") REFERENCES "user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION
);

-- Table: custom_role
CREATE TABLE "custom_role" (
    "id" VARCHAR(255) PRIMARY KEY,
    "owner_id" INTEGER NOT NULL,
    "role_name" VARCHAR(255) NOT NULL,
    "max_users" INTEGER,
    "expire_date" TIMESTAMP(0) WITH TIME ZONE,
    "reaction_icon" VARCHAR(255) NOT NULL,
    "channel_id" VARCHAR(255),
    "guild_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "custom_role_owner_id_foreign"
        FOREIGN KEY ("owner_id") REFERENCES "guild_user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION,

    CONSTRAINT "custom_role_guild_id_foreign"
        FOREIGN KEY ("guild_id") REFERENCES "guild"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION
);

-- Table: category
CREATE TABLE "category" (
    "id" VARCHAR(255) PRIMARY KEY,
    "public_voice" VARCHAR(255),
    "mute_voice" VARCHAR(255),
    "private_voice" VARCHAR(255),
    "lobby_category" VARCHAR(255)
);

-- Table: lobby_name_change
CREATE TABLE "lobby_name_change" (
    "id" SERIAL PRIMARY KEY,
    "guild_user_id" INTEGER NOT NULL,
    "name" VARCHAR(99) NOT NULL,
    "date" TIMESTAMP(0) WITH TIME ZONE NOT NULL,

    CONSTRAINT "lobby_name_change_guild_user_id_foreign"
        FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION
);

CREATE INDEX "lobby_name_change_guild_user_id_index"
    ON "lobby_name_change" ("guild_user_id");

-- Table: quote
CREATE TABLE "quote" (
    "id" SERIAL PRIMARY KEY,
    "guild_user_id" INTEGER NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "date" TIMESTAMP(0) WITH TIME ZONE,

    CONSTRAINT "quote_guild_user_id_foreign"
        FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION,

    CONSTRAINT "quote_creator_id_foreign"
        FOREIGN KEY ("creator_id") REFERENCES "guild_user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION
);

-- Table: temp_channel
CREATE TABLE "temp_channel" (
    "channel_id" VARCHAR(255) PRIMARY KEY,
    "guild_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) WITH TIME ZONE NOT NULL,
    "name" VARCHAR(98),
    "text_channel_id" VARCHAR(24),
    "control_dashboard_id" VARCHAR(24),

    CONSTRAINT "temp_channel_guild_user_id_unique"
        UNIQUE ("guild_user_id"),

    CONSTRAINT "temp_channel_guild_user_id_foreign"
        FOREIGN KEY ("guild_user_id") REFERENCES "guild_user"("id")
        ON UPDATE CASCADE ON DELETE NO ACTION
);
