import {
  User as DiscordUser, DMChannel, NewsChannel, OverwriteData, Permissions, Guild as DiscordGuild,
} from 'discord.js';
import Router from '../Router';

const router = new Router();
const createRouter = new Router();

interface TempChannelOptions {
  muted?: boolean
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: DiscordUser[], owner: DiscordUser,
  { muted = false }: TempChannelOptions,
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

  await guild.channels.create('Ranked', {
    type: 'voice',
    permissionOverwrites,
    parent,
  });
}

createRouter.use(DiscordUser, async ({ msg, params, flags }) => {
  const nonUsers = params.filter((param) => !(param instanceof DiscordUser));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);

  if (msg.channel instanceof DMChannel || msg.channel instanceof NewsChannel) {
    msg.channel.send('Je kan alleen lobbies aanmaken op een server');
    return;
  }

  if (nonUsers.length) {
    msg.channel.send('Alleen user mentions mogelijk als argument(en)');
  }

  createTempChannel(msg.guild, msg.channel.parentID, users, msg.author, { muted: flags.some((a) => a === 'nospeak') });
});

router.use('create', createRouter);

router.use('remove', (info) => {
  info.msg.channel.send('Removing channel');
});

export default router;
