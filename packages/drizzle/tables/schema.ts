import {
  boolean,
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

export const channels = pgTable('channel', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
});

export type Channel = typeof channels.$inferSelect;

export const guilds = pgTable('guild', {
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

export const users = pgTable(
  'user',
  {
    id: varchar('id', { length: 255 }).primaryKey().notNull(),
    count: integer('count').default(0).notNull(),
    birthday: timestamp('birthday', { withTimezone: true, mode: 'string' }),
    language: varchar('language', { length: 255 }),
    timezone: varchar('timezone', { length: 255 }),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
  },
  (table) => ({
    birthdayIdx: index().on(table.birthday),
  }),
);

export const guildUsers = pgTable(
  'guild_user',
  {
    guildId: varchar('guild_id', { length: 255 })
      .notNull()
      .references(() => guilds.id, { onUpdate: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onUpdate: 'cascade' }),
    id: serial('id').primaryKey().notNull(),
    birthdayMsg: varchar('birthday_msg', { length: 20 }),
  },
  (table) => ({
    guildUserGuildIdUserIdUnique: unique(
      'guild_user_guild_id_user_id_unique',
    ).on(table.guildId, table.userId),
  }),
);

export const customRoles = pgTable('custom_role', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => guildUsers.id, { onUpdate: 'cascade' }),
  roleName: varchar('role_name', { length: 255 }).notNull(),
  maxUsers: integer('max_users'),
  expireDate: timestamp('expire_date', { withTimezone: true, mode: 'string' }),
  reactionIcon: varchar('reaction_icon', { length: 255 }).notNull(),
  channelId: varchar('channel_id', { length: 255 }),
  guildId: varchar('guild_id', { length: 255 })
    .notNull()
    .references(() => guilds.id, { onUpdate: 'cascade' }),
});

export const categories = pgTable('category', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  publicVoice: varchar('public_voice', { length: 255 }),
  muteVoice: varchar('mute_voice', { length: 255 }),
  privateVoice: varchar('private_voice', { length: 255 }),
  lobbyCategory: varchar('lobby_category', { length: 255 }),
});

export type Category = typeof categories.$inferSelect;

export type GuildUser = typeof guildUsers.$inferSelect;

export const lobbyNameChanges = pgTable(
  'lobby_name_change',
  {
    id: serial('id').primaryKey().notNull(),
    guildUserId: integer('guild_user_id')
      .notNull()
      .references(() => guildUsers.id, { onUpdate: 'cascade' }),
    name: varchar('name', { length: 99 }).notNull(),
    date: timestamp('date', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => ({
    guildUserIdIdx: index().on(table.guildUserId),
  }),
);

export type LobbyNameChange = typeof lobbyNameChanges.$inferSelect;

export const quotes = pgTable('quote', {
  id: serial('id').primaryKey().notNull(),
  guildUserId: integer('guild_user_id')
    .notNull()
    .references(() => guildUsers.id, { onUpdate: 'cascade' }),
  text: varchar('text', { length: 2000 }).notNull(),
  creatorId: integer('creator_id')
    .notNull()
    .references(() => guildUsers.id, { onUpdate: 'cascade' }),
  date: timestamp('date', { withTimezone: true, mode: 'string' }),
});

export type Quote = typeof quotes.$inferSelect;

export const tempChannels = pgTable(
  'temp_channel',
  {
    channelId: varchar('channel_id', { length: 255 }).primaryKey().notNull(),
    guildUserId: integer('guild_user_id')
      .notNull()
      .references(() => guildUsers.id, { onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    name: varchar('name', { length: 98 }),
    textChannelId: varchar('text_channel_id', { length: 24 }),
    controlDashboardId: varchar('control_dashboard_id', { length: 24 }),
  },
  (table) => ({
    tempChannelGuildUserIdUnique: unique(
      'temp_channel_guild_user_id_unique',
    ).on(table.guildUserId),
  }),
);

export type TempChannel = typeof tempChannels.$inferSelect;

export type Guild = typeof guilds.$inferSelect;

export type User = typeof users.$inferSelect;