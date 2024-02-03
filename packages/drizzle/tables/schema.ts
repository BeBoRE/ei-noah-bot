import {
  bigint,
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
  roleMenuChannelId: varchar('role_menu_channel_id', { length: 255 }),
  roleCreatorRoleId: varchar('role_creator_role_id', { length: 255 }),
  defaultColor: varchar('default_color', { length: 255 }),
  requiredRole: varchar('required_role', { length: 255 }),
  category: varchar('category', { length: 255 }),
  language: varchar('language', { length: 255 }),
  seperateTextChannel: boolean('seperate_text_channel')
    .default(false)
    .notNull(),
});

export const users = pgTable('user', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  count: integer('count').default(0).notNull(),
  language: varchar('language', { length: 255 }),
  timezone: varchar('timezone', { length: 255 }),
});

export const birthdays = pgTable(
  'birthday',
  {
    id: serial('id').primaryKey().notNull(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    date: timestamp('date', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
  },
  (table) => ({
    userIdIdx: index().on(table.userId),
    dateIndex: index().on(table.date),
  }),
);

export type Birthday = typeof birthdays.$inferSelect;

export const loginTokens = pgTable('login_token', {
  token: varchar('token', {
    length: 72,
  }).primaryKey(),
  userId: varchar('user_id', {
    length: 255,
  })
    .notNull()
    .references(() => users.id),
  expires: bigint('expires', {
    mode: 'number',
  }).notNull(),
  used: boolean('used').default(false).notNull(),
});

export const session = pgTable('session', {
  id: varchar('id', {
    length: 128,
  }).primaryKey(),
  userId: varchar('user_id', {
    length: 255,
  })
    .notNull()
    .references(() => users.id),
  activeExpires: bigint('active_expires', {
    mode: 'number',
  }).notNull(),
  idleExpires: bigint('idle_expires', {
    mode: 'number',
  }).notNull(),
  expoPushToken: varchar('expo_push_token', { length: 255 }),
});

export const keys = pgTable('key', {
  id: varchar('id', {
    length: 255,
  }).primaryKey(),
  userId: varchar('user_id', {
    length: 255,
  })
    .notNull()
    .references(() => users.id),
  hashedPassword: varchar('hashed_password', {
    length: 255,
  }),
});

export const guildUsers = pgTable(
  'guild_user',
  {
    id: serial('id').primaryKey().notNull(),
    guildId: varchar('guild_id', { length: 255 })
      .notNull()
      .references(() => guilds.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    birthdayMsg: varchar('birthday_msg', { length: 20 }),
  },
  (table) => ({
    guildUserGuildIdUserIdUnique: unique(
      'guild_user_guild_id_user_id_unique',
    ).on(table.guildId, table.userId),
  }),
);

export const roles = pgTable('role', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  guildId: varchar('guild_id', { length: 255 })
    .notNull()
    .references(() => guilds.id, {
      onUpdate: 'cascade',
      onDelete: 'cascade',
    }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  createdBy: integer('created_by').references(() => guildUsers.id, {
    onUpdate: 'cascade',
    onDelete: 'set null',
  }),
});

export type Role = typeof roles.$inferSelect;

export const nonApprovedRoles = pgTable('non_approved_role', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 99 }).notNull(),
  guildId: varchar('guild_id', { length: 255 })
    .notNull()
    .references(() => guilds.id, {
      onUpdate: 'cascade',
      onDelete: 'cascade',
    }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  createdBy: integer('created_by').references(() => guildUsers.id, {
    onUpdate: 'cascade',
    onDelete: 'set null',
  }),
  approvedRoleId: varchar('approved_role_id', { length: 255 }).references(
    () => roles.id,
    { onUpdate: 'cascade', onDelete: 'set null' },
  ),
  approvedAt: timestamp('approved_at', {
    withTimezone: true,
    mode: 'string',
  }),
  approvedBy: integer('approved_by').references(() => guildUsers.id, {
    onUpdate: 'cascade',
    onDelete: 'set null',
  }),
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
