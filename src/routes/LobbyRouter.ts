import {
  User as DiscordUser,
  DMChannel,
  NewsChannel,
  OverwriteData,
  Permissions,
  Guild as DiscordGuild,
  Client,
  VoiceChannel,
} from 'discord.js';
import { GuildUser } from 'entity/GuildUser';
import Router from '../Router';

const router = new Router();
const createRouter = new Router();

interface TempChannelOptions {
  muted?: boolean
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: DiscordUser[], owner: DiscordUser,
  { muted }: TempChannelOptions,
) {
  const userSnowflakes = [...new Set([...users.map((user) => user.id), owner.id])];

  const permissionOverwrites : OverwriteData[] = userSnowflakes.map((id) => ({
    id,
    allow: [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK],
  }));

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

  const activeChannel = await client.channels.fetch(guildUser.tempChannel, false);
  if (activeChannel instanceof VoiceChannel) {
    return activeChannel;
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
      msg.channel.send('You already have a lobby');
    } else {
      const createdChannel = await createTempChannel(msg.guild, msg.channel.parentID, users, msg.author, { muted: flags.some((a) => a === 'nospeak') });
      const user = guildUser;

      user.tempChannel = createdChannel.id;

      return user;
    }
  }

  return null;
});

router.use('create', createRouter);

router.use('remove', (info) => {
  info.msg.channel.send('Removing channel');
});

export default router;
