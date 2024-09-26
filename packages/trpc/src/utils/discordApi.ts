import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { discordMemberSchema, discordUserSchema } from '../schemas';
import { camelize } from '../utils';
import {
  getCachedMember,
  getCachedUser,
  setCachedMember,
  setCachedUser,
} from './kv';

export const rest = new REST({ version: '10' }).setToken(
  process.env.CLIENT_TOKEN || '',
);

export const getApiMember = async (guildId: string, userId: string) => {
  const member = await rest
    .get(Routes.guildMember(guildId, userId))
    .then((res) => camelize(res))
    .then((res) => discordMemberSchema.parse(res));

  setCachedMember(guildId, userId, member);

  return member;
};

export const getCachedOrApiMember = async (guildId: string, userId: string) => {
  const apiMember = getApiMember(guildId, userId);
  const cachedMember = getCachedMember(guildId, userId);

  if (await cachedMember) {
    return cachedMember;
  }

  return apiMember;
};

export const getApiUser = async (userId: string) => {
  const user = await rest
    .get(Routes.user(userId))
    .then((res) => camelize(res))
    .then((res) => discordUserSchema.parse(res));

  setCachedUser(userId, user);

  return user;
};

export const getCachedOrApiUser = async (userId: string) => {
  const apiUser = getApiUser(userId);
  const cachedUser = getCachedUser(userId);

  if (await cachedUser) {
    return cachedUser;
  }

  return apiUser;
};
