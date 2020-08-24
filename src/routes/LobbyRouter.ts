import {
  User as DiscordUser,
  DMChannel,
  NewsChannel,
  OverwriteData,
  Permissions,
  Guild as DiscordGuild,
  Client,
  VoiceChannel,
  DiscordAPIError,
} from 'discord.js';
import { getRepository } from 'typeorm';
import { saveUserData } from '../data';
import { GuildUser } from '../entity/GuildUser';
import { TempChannel } from '../entity/TempChannel';
import Router from '../Router';

const router = new Router();
const createRouter = new Router();

interface TempChannelOptions {
  muted?: boolean
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: DiscordUser[], owner: DiscordUser,
  bot: DiscordUser,
  { muted }: TempChannelOptions,
) {
  const userSnowflakes = [...new Set([...users.map((user) => user.id), owner.id])];

  const permissionOverwrites : OverwriteData[] = userSnowflakes.map((id) => ({
    id,
    allow: [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK],
  }));

  permissionOverwrites.push({
    id: bot.id,
    allow: [
      Permissions.ALL,
    ],
  });

  permissionOverwrites.push({
    id: owner.id,
    allow: [
      Permissions.FLAGS.CONNECT,
      Permissions.FLAGS.SPEAK,
    ],
  });

  permissionOverwrites.push({
    id: guild.id,
    deny: [Permissions.FLAGS.SPEAK, !muted ? Permissions.FLAGS.CONNECT : undefined],
  });

  return guild.channels.create('Ranked', {
    type: 'voice',
    permissionOverwrites,
    parent,
  });
}

async function activeTempChannel(guildUser : GuildUser, client : Client) : Promise<VoiceChannel> {
  if (!guildUser.tempChannel) return undefined;

  try {
    const activeChannel = await client.channels.fetch((await guildUser.tempChannel).id, false);
    if (activeChannel instanceof VoiceChannel) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) {
        return undefined;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return undefined;
}

createRouter.use(DiscordUser, async ({
  msg, params, flags, guildUser,
}) => {
  const nonUsers = params.filter((param) => !(param instanceof DiscordUser));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);

  if (msg.channel instanceof DMChannel || msg.channel instanceof NewsChannel) {
    msg.channel.send('Je kan alleen lobbies aanmaken op een server');
  } else if (nonUsers.length) {
    msg.channel.send('Alleen user mentions mogelijk als argument(en)');
  } else {
    const activeChannel = await activeTempChannel(guildUser, msg.client);

    if (activeChannel) {
      msg.channel.send('Je hebt al een lobby');
    } else {
      const createdChannel = await createTempChannel(msg.guild, msg.channel.parentID, users, msg.author, msg.client.user, { muted: flags.some((a) => a === 'nospeak') });

      const tempRep = getRepository(TempChannel);

      await tempRep.delete({ guildUser });

      const tempChannel = tempRep.create({ guildUser, id: createdChannel.id });

      try {
        await saveUserData(guildUser);
        await tempRep.save(tempChannel);
      } catch (err) {
        createdChannel.delete();
        throw err;
      }
    }
  }
});

router.use('create', createRouter);

router.use('add', async ({ params, msg, guildUser }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Dit commando kan alleen gebruikt worden op een server');
    return;
  }

  const nonUsers = params.filter((param) => !(param instanceof DiscordUser));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);

  if (nonUsers.length > 0) {
    msg.channel.send('Alleen user mention(s) mogelijk als argument');
    return;
  }

  const activeChannel = await activeTempChannel(guildUser, msg.client);

  if (!activeChannel) {
    msg.channel.send('Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`');
    return;
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    msg.channel.send('Je lobby is aanwezig in een andere categorie dan deze');
    return;
  }

  const allowedUsers : DiscordUser[] = [];
  const alreadyAllowedUsers : DiscordUser[] = [];

  users.forEach((user) => {
    if (activeChannel.permissionOverwrites.some((o) => user.id === o.id)) {
      alreadyAllowedUsers.push(user);
    } else {
      activeChannel.updateOverwrite(user, {
        CONNECT: true,
        SPEAK: true,
      });

      allowedUsers.push(user);
    }
  });

  let allowedUsersMessage : string;
  if (!allowedUsers.length) allowedUsersMessage = 'Geen user(s) toegevoegd';
  else allowedUsersMessage = `${allowedUsers.map((user) => user.username).join(', ')} ${allowedUsers.length > 1 ? 'mogen' : 'mag'} nu naar binnen`;

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = `${alreadyAllowedUsers.map((user) => user.username).join(', ')} ${alreadyAllowedUsers.length > 1 ? 'konden' : 'kon'} al naar binnen`;

  msg.channel.send(`${allowedUsersMessage}\n${alreadyInMessage}`);
});

router.use('remove', async ({ params, msg, guildUser }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Dit commando kan alleen gebruikt worden op een server');
    return;
  }

  const nonUsers = params.filter((param) => !(param instanceof DiscordUser));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);

  if (nonUsers.length > 0) {
    msg.channel.send('Alleen user mention(s) mogelijk als argument');
    return;
  }

  const activeChannel = await activeTempChannel(guildUser, msg.client);

  if (!activeChannel) {
    msg.channel.send('Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`');
    return;
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    msg.channel.send('Je lobby is aanwezig in een andere categorie dan deze');
    return;
  }

  let triedRemoveSelf = false;
  let triedRemoveEi = false;
  const notRemoved = users.filter((user) => {
    let removed = false;
    if (user.id === msg.author.id) triedRemoveSelf = true;
    else if (user.id === msg.client.user.id) triedRemoveEi = true;
    else {
      const member = activeChannel.members.get(user.id);
      if (member && member.voice.channelID === activeChannel.id) {
        member.voice.setChannel(null);
        removed = true;
      }

      if (activeChannel.permissionOverwrites.has(user.id)) {
        activeChannel.permissionOverwrites.get(user.id).delete();
        removed = true;
      }
    }

    return !removed;
  });

  if (notRemoved.length > 0) {
    let message = `${notRemoved.map((user) => user.username).join(', ')} ${notRemoved.length > 1 ? 'zijn' : 'is'} niet verwijderd`;
    if (triedRemoveSelf) message += '\nJe kan jezelf niet verwijderen';
    if (triedRemoveEi) message += '\nEi Noah is omnipresent';

    msg.channel.send(message);
  } else {
    msg.channel.send('Alle gegeven personen zijn verwijderd');
  }
});

router.onInit = async (client) => {
  const tempRepo = getRepository(TempChannel);

  setInterval(async () => {
    const tempChannels = await tempRepo.find();
    const now = new Date();

    tempChannels.forEach(async (tempChannel) => {
      const difference = now.getMinutes() - tempChannel.createdAt.getMinutes();
      if (difference > 1) {
        const { guildUser } = tempChannel;
        const activeChannel = await activeTempChannel(guildUser, client);

        if (!activeChannel) tempRepo.remove(tempChannel);
        else if (!activeChannel.members.size) {
          activeChannel.delete().then(() => {
            tempRepo.remove(tempChannel);
          }).catch(console.error);
        }
      }
    });
  }, 1000 * 60);
};

export default router;
