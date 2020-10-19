import { User as DiscordUser, Guild as DiscordGuild, CategoryChannel } from 'discord.js';
import { EntityManager, MikroORM } from 'mikro-orm';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { User } from './entity/User';
import { Guild } from './entity/Guild';

const getGuildData = async (em : EntityManager, guild : DiscordGuild) : Promise<Guild> => {
  const dbGuild = await em.findOne(Guild, { id: guild.id });

  if (!dbGuild) {
    const newGuild = new Guild();
    newGuild.id = guild.id;

    await em.persist(newGuild, true);

    return newGuild;
  }

  return dbGuild;
};

const getUserData = async (em : EntityManager, user: DiscordUser) : Promise<User> => {
  const dbUser = await em.findOne(User, { id: user.id });

  if (!dbUser) {
    const newUser = new User();
    newUser.id = user.id;

    await em.persist(newUser, true);

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

    await em.persist(newGuildUser, true);

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

  await em.persist(newCategory, true);

  return newCategory;
};

export const ORM = MikroORM.init();
ORM.then(() => console.log('OMR Ready'));

export {
  getUserGuildData, getUserData, getGuildData, getCategoryData,
};
