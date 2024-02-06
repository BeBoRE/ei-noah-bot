import SuperJSON from 'superjson';

import { redis } from '@ei/redis';

import { discordMemberSchema, discordUserSchema } from '../schemas';

const memberKey = (guildId: string, userId: string) =>
  `guild:${guildId}:member:${userId}`;

export const getCachedMember = async (guildId: string, userId: string) => {
  const serialized = await redis.get(memberKey(guildId, userId));

  if (!serialized) {
    return null;
  }

  const parsed = discordMemberSchema.safeParse(SuperJSON.parse(serialized));

  if (!parsed.success) {
    console.warn(parsed.error);
    console.warn('GOT', serialized);

    return null;
  }

  return parsed.data;
};

export const setCachedMember = async (
  guildId: string,
  userId: string,
  member: Zod.infer<typeof discordMemberSchema>,
) => {
  const serialized = SuperJSON.stringify(member);

  await redis.set(memberKey(guildId, userId), serialized);
  await redis.expire(memberKey(guildId, userId), 60 * 5);
};

const userKey = (userId: string) => `user:${userId}`;

export const getCachedUser = async (userId: string) => {
  const serialized = await redis.get(userKey(userId));

  if (!serialized) {
    return null;
  }

  const parsed = discordUserSchema.safeParse(SuperJSON.parse(serialized));

  if (!parsed.success) {
    console.warn(parsed.error);
    console.warn('GOT', serialized);

    return null;
  }

  return parsed.data;
};

export const setCachedUser = async (
  userId: string,
  user: Zod.infer<typeof discordUserSchema>,
) => {
  const serialized = SuperJSON.stringify(user);

  const key = userKey(userId);

  await redis.set(key, serialized);
  await redis.expire(key, 60 * 5);
};
