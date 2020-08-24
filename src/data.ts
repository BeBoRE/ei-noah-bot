import { User as DiscordUser, Guild as DiscordGuild } from 'discord.js';
import { getRepository } from 'typeorm';
import { GuildUser } from './entity/GuildUser';
import { User } from './entity/User';
import { Guild } from './entity/Guild';

const getGuildData = async (guild : DiscordGuild) : Promise<Guild> => {
  const guildRepo = getRepository(Guild);
  const dbGuild = await guildRepo.findOne({ where: { id: guild.id } });

  if (!dbGuild) {
    const newGuild = guildRepo.create({ id: guild.id });

    return newGuild;
  }

  return dbGuild;
};

const getUserData = async (user: DiscordUser) : Promise<User> => {
  const userRepo = getRepository(User);
  const dbUser = await userRepo.findOne({ where: { id: user.id } });

  if (!dbUser) {
    const newUser = userRepo.create({ id: user.id });

    return newUser;
  }

  return dbUser;
};

const getUserGuildData = async (user : DiscordUser, guild : DiscordGuild) : Promise<GuildUser> => {
  const guildUserRepo = getRepository(GuildUser);
  const dbGuildUser = await guildUserRepo.findOne(
    { where: { userId: user.id, guildId: guild.id } },
  );

  if (!dbGuildUser) {
    const dbUser = await getUserData(user);
    const dbGuild = await getGuildData(guild);

    const newGuildUser = guildUserRepo.create({ user: dbUser, guild: dbGuild });

    return newGuildUser;
  }

  return dbGuildUser;
};

const saveUserData = async (guildUser : GuildUser) => {
  const guRepo = getRepository(GuildUser);
  const userRepo = getRepository(User);
  const guildRepo = getRepository(Guild);

  await guildRepo.save(guildUser.guild);
  await userRepo.save(guildUser.user);
  await guRepo.save(guildUser);
};

export {
  getUserGuildData, getUserData, getGuildData, saveUserData,
};
