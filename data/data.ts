import {
  User as DiscordUser, Guild as DiscordGuild, CategoryChannel, Client,
} from 'discord.js';
import { EntityManager } from '@mikro-orm/core';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { User } from './entity/User';
import { Guild } from './entity/Guild';
import 'reflect-metadata';

const getGuildData = async (em : EntityManager, guild : DiscordGuild) : Promise<Guild> => {
  const dbGuild = await em.findOne(Guild, { id: guild.id });

  if (!dbGuild) {
    const newGuild = new Guild();
    newGuild.id = guild.id;

    await em.persistAndFlush(newGuild);

    return newGuild;
  }

  return dbGuild;
};

const getUserData = async (em : EntityManager, user: DiscordUser) : Promise<User> => {
  const dbUser = await em.findOne(User, { id: user.id });

  if (!dbUser) {
    const newUser = new User();
    newUser.id = user.id;

    await em.persistAndFlush(newUser);

    return newUser;
  }

  return dbUser;
};

const getUserGuildData = async (em : EntityManager, user : DiscordUser, guild : DiscordGuild) => {
  const dbGuildUser = await em.findOne(GuildUser,
    { guild: { id: guild.id }, user: { id: user.id } });

  if (!dbGuildUser) {
    const dbUser = await getUserData(em, user);
    const dbGuild = await getGuildData(em, guild);

    const newGuildUser = new GuildUser();
    newGuildUser.user = dbUser;
    newGuildUser.guild = dbGuild;

    await em.persistAndFlush(newGuildUser);

    return newGuildUser;
  }

  return dbGuildUser;
};

const getCategoryData = async (em : EntityManager, category : CategoryChannel | null) => {
  if (!category) return null;

  const dbCategory = await em.findOne(Category, { id: category.id });

  if (dbCategory) return dbCategory;

  const newCategory = new Category();
  newCategory.id = category.id;

  await em.persistAndFlush(newCategory);

  return newCategory;
};

export interface ExtendedUser {
  user: User
  avatar: string | null,
  username: string
}

export const getExtendedUser = async (user : User, client : Client) : Promise<ExtendedUser> => {
  const { avatar, username } = await client.users.fetch(user.id, true);

  return { user, avatar, username };
};

export {
  getUserGuildData, getUserData, getGuildData, getCategoryData,
};
