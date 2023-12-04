import { z } from 'zod';

export const channelSchema = z.object({
  id: z.string(),
  type: z.number(),
  guildId: z.string(),
  position: z.number(),
  permissionOverwrites: z.array(z.unknown()),
  name: z.string(),
  parentId: z.string().nullable(),
});

export const ApiRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number(),
  hoist: z.boolean(),
  position: z.number(),
  permissions: z.string(),
});

export type ApiRole = z.infer<typeof ApiRoleSchema>;

export const apiGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional().nullable(),
  ownerId: z.string(),
  roles: z.array(ApiRoleSchema),
});

export const apiMessageSchema = z.object({
  id: z.string(),
});

export type ApiGuild = z.infer<typeof apiGuildSchema>;

export const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  publicFlags: z.number(),
  flags: z.number(),
  banner: z.string().nullable(),
  accentColor: z.number().nullable(),
  globalName: z.string().nullable(),
  bannerColor: z.string().nullable(),
});

export const discordMemberSchema = z.object({
  avatar: z.string().nullable(),
  joinedAt: z.string(),
  nick: z.string().nullable(),
  pending: z.boolean(),
  premiumSince: z.string().nullable(),
  roles: z.array(z.string()),
  flags: z.number().int(),
  mute: z.boolean(),
  deaf: z.boolean(),
  user: discordUserSchema,
});

export type DiscordMember = z.infer<typeof discordMemberSchema>;
