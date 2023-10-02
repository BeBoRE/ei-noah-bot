import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const mikroOrmMigrations = pgTable('mikro_orm_migrations', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }),
  executedAt: timestamp('executed_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
});

export const channel = pgTable('channel', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
});

export const customRole = pgTable('custom_role', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => guildUser.id, { onUpdate: 'cascade' }),
  roleName: varchar('role_name', { length: 255 }).notNull(),
  maxUsers: integer('max_users'),
  expireDate: timestamp('expire_date', { withTimezone: true, mode: 'string' }),
  reactionIcon: varchar('reaction_icon', { length: 255 }).notNull(),
  channelId: varchar('channel_id', { length: 255 }),
  guildId: varchar('guild_id', { length: 255 })
    .notNull()
    .references(() => guild.id, { onUpdate: 'cascade' }),
});

export const category = pgTable('category', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  publicVoice: varchar('public_voice', { length: 255 }),
  muteVoice: varchar('mute_voice', { length: 255 }),
  privateVoice: varchar('private_voice', { length: 255 }),
  lobbyCategory: varchar('lobby_category', { length: 255 }),
});

export const guildUser = pgTable(
  'guild_user',
  {
    guildId: varchar('guild_id', { length: 255 })
      .notNull()
      .references(() => guild.id, { onUpdate: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => user.id, { onUpdate: 'cascade' }),
    id: serial('id').primaryKey().notNull(),
    birthdayMsg: varchar('birthday_msg', { length: 20 }),
  },
  (table) => {
    return {
      guildUserGuildIdUserIdUnique: unique(
        'guild_user_guild_id_user_id_unique',
      ).on(table.guildId, table.userId),
    };
  },
);

export const lobbyNameChange = pgTable(
  'lobby_name_change',
  {
    id: serial('id').primaryKey().notNull(),
    guildUserId: integer('guild_user_id')
      .notNull()
      .references(() => guildUser.id, { onUpdate: 'cascade' }),
    name: varchar('name', { length: 99 }).notNull(),
    date: timestamp('date', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => {
    return {
      guildUserIdIdx: index().on(table.guildUserId),
    };
  },
);

export const quote = pgTable('quote', {
  id: serial('id').primaryKey().notNull(),
  guildUserId: integer('guild_user_id')
    .notNull()
    .references(() => guildUser.id, { onUpdate: 'cascade' }),
  text: varchar('text', { length: 2000 }).notNull(),
  creatorId: integer('creator_id')
    .notNull()
    .references(() => guildUser.id, { onUpdate: 'cascade' }),
  date: timestamp('date', { withTimezone: true, mode: 'string' }),
});

export const tempChannel = pgTable(
  'temp_channel',
  {
    channelId: varchar('channel_id', { length: 255 }).primaryKey().notNull(),
    guildUserId: integer('guild_user_id')
      .notNull()
      .references(() => guildUser.id, { onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    name: varchar('name', { length: 98 }),
    textChannelId: varchar('text_channel_id', { length: 24 }),
    controlDashboardId: varchar('control_dashboard_id', { length: 24 }),
  },
  (table) => {
    return {
      tempChannelGuildUserIdUnique: unique(
        'temp_channel_guild_user_id_unique',
      ).on(table.guildUserId),
    };
  },
);

export const guild = pgTable('guild', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  bitrate: integer('bitrate').default(96000).notNull(),
  birthdayChannel: varchar('birthday_channel', { length: 255 }),
  birthdayRole: varchar('birthday_role', { length: 255 }),
  roleMenuId: varchar('role_menu_id', { length: 255 }),
  defaultColor: varchar('default_color', { length: 255 }),
  requiredRole: varchar('required_role', { length: 255 }),
  category: varchar('category', { length: 255 }),
  language: varchar('language', { length: 255 }),
  seperateTextChannel: boolean('seperate_text_channel')
    .default(false)
    .notNull(),
});

export const user = pgTable(
  'user',
  {
    id: varchar('id', { length: 255 }).primaryKey().notNull(),
    count: integer('count').default(0).notNull(),
    birthday: timestamp('birthday', { withTimezone: true, mode: 'string' }),
    language: varchar('language', { length: 255 }),
    timezone: varchar('timezone', { length: 255 }),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
  },
  (table) => {
    return {
      birthdayIdx: index().on(table.birthday),
    };
  },
);
