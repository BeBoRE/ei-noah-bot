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
  Constants,
  Role,
} from 'discord.js';
import { getRepository } from 'typeorm';
import { Category } from '../entity/Category';
import { saveUserData, getUserGuildData } from '../data';
import { GuildUser } from '../entity/GuildUser';
import { TempChannel } from '../entity/TempChannel';
import Router, { Handler } from '../Router';

const router = new Router();

interface TempChannelOptions {
  muted?: boolean
}

function generateLobbyName(muted : boolean, owner : DiscordUser) {
  return `${muted ? '🔇' : '🔉'} ${owner.username}'s Lobby`;
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: Array<DiscordUser | Role>, owner: DiscordUser,
  bot: DiscordUser,
  bitrate: number,
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

  return guild.channels.create(generateLobbyName(muted, owner), {
    type: 'voice',
    permissionOverwrites,
    parent,
    bitrate,
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

const createHandler : Handler = async ({
  msg, params, flags, guildUser, category,
}) => {
  const nonUsersAndRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const invited = params
    // eslint-disable-next-line max-len
    .filter((param): param is DiscordUser | Role => param instanceof DiscordUser || param instanceof Role)
    .filter((user) => user.id !== msg.author.id && user.id !== msg.client.user.id);

  if (msg.channel instanceof DMChannel || msg.channel instanceof NewsChannel) {
    msg.channel.send('Je kan alleen lobbies aanmaken op een server');
  } else if (!category || !category.isLobbyCategory) {
    msg.channel.send('Je mag geen lobbies aanmaken in deze category');
  } else if (nonUsersAndRoles.length) {
    msg.channel.send('Alleen mentions mogelijk als argument(en)');
  } else {
    const activeChannel = await activeTempChannel(guildUser, msg.client);

    if (activeChannel) {
      msg.channel.send('Je hebt al een lobby');
    } else {
      try {
        const createdChannel = await createTempChannel(msg.guild, msg.channel.parentID, invited, msg.author, msg.client.user, guildUser.guild.bitrate, { muted: flags.some((a) => a === 'nospeak') });

        const tempRep = getRepository(TempChannel);

        await tempRep.delete({ guildUser });

        const tempChannel = tempRep.create({ guildUser, id: createdChannel.id });

        try {
          await saveUserData(guildUser);
          await tempRep.save(tempChannel);

          if (invited.length > 0) {
            msg.channel.send(`Lobby aangemaakt voor ${invited.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} en jij`);
          } else msg.channel.send('Lobby aangemaakt');
        } catch (err) {
          createdChannel.delete();
          throw err;
        }
      } catch (err) {
        if (err instanceof DiscordAPIError) {
          if (err.code === Constants.APIErrors.INVALID_FORM_BODY) {
            msg.channel.send('Neem contact op met de server admins, waarschijnlijk staat de bitrate voor de bot te hoog');
          }
        } else {
          msg.channel.send('Onverwachte error');
        }
      }
    }
  }
};

// ei lobby create ...
const createRouter = new Router();
router.use('create', createRouter);

createRouter.use(Role, createHandler);
createRouter.use(DiscordUser, createHandler);
createRouter.use(null, createHandler);

router.use('add', async ({ params, msg, guildUser }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Dit commando kan alleen gebruikt worden op een server');
    return;
  }

  const nonUserOrRole = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const userOrRole = params
    // eslint-disable-next-line max-len
    .filter((param): param is DiscordUser | Role => param instanceof DiscordUser || param instanceof Role);

  if (nonUserOrRole.length > 0) {
    msg.channel.send('Alleen user mention(s) mogelijk als argument');
    return;
  }

  const activeChannel = await activeTempChannel(guildUser, msg.client);

  if (!activeChannel) {
    msg.channel.send('Je hebt nog geen lobby aangemaakt\nMaak deze aan met `ei lobby create`');
    return;
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    msg.channel.send('Je lobby is aanwezig in een andere categorie dan deze');
    return;
  }

  const allowedUsers : Array<DiscordUser | Role> = [];
  const alreadyAllowedUsers : Array<DiscordUser | Role> = [];

  userOrRole.forEach((user) => {
    if (activeChannel.permissionOverwrites.some((o) => user.id === o.id)) {
      alreadyAllowedUsers.push(user);
    } else {
      activeChannel.updateOverwrite(user, {
        CONNECT: true,
        SPEAK: true,
      });

      allowedUsers.push(user);

      activeChannel.members.get(user.id)?.voice.setMute(false);
    }
  });

  let allowedUsersMessage : string;
  if (!allowedUsers.length) allowedUsersMessage = 'Geen user(s) toegevoegd';
  else allowedUsersMessage = `${allowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${allowedUsers.length > 1 ? 'mogen' : 'mag'} nu naar binnen`;

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = `${alreadyAllowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${alreadyAllowedUsers.length > 1 ? 'konden' : 'kon'} al naar binnen`;

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
    msg.channel.send('Alle gegeven personen zijn uit de lobby verwijderd');
  }
});

router.use('type', async ({ params, msg, guildUser }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Dit commando kan alleen op servers worden gebruikt');
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

  if (params.length > 1) {
    msg.channel.send('Ik verwachte niet meer dan **één** argument');
    return;
  }

  const muted = !activeChannel.permissionOverwrites.get(msg.guild.id).deny.has('CONNECT');
  if (params.length !== 1) {
    msg.channel.send(muted ? 'Je kanaal is van type `nospeak`\nAndere type is `nojoin`' : 'Je kanaal is van type `nojoin`\nAndere type is `nospeak`');
  } else if (params.length === 1) {
    if (typeof params[0] !== 'string') {
      msg.channel.send('Ik verwachte hier geen **mention**');
      return;
    }

    if (params[0] === 'nospeak') {
      if (muted) {
        msg.channel.send('Je lobby was al een **nospeak** lobby');
        return;
      }

      activeChannel.setName(generateLobbyName(!muted, msg.author));
      activeChannel.updateOverwrite(msg.guild.id, { CONNECT: null });
      msg.channel.send('Je kanaal is veranderd naar een **nospeak** lobby');
      return;
    }

    if (params[0] === 'nojoin') {
      if (!muted) {
        msg.channel.send('Je lobby was al een **nojoin** lobby');
        return;
      }

      activeChannel.members.filter((member) => !activeChannel.permissionOverwrites.has(member.id))
        .forEach((member) => member.voice.setChannel(null));

      activeChannel.setName(generateLobbyName(!muted, msg.author));
      activeChannel.updateOverwrite(msg.guild.id, { CONNECT: false });
      msg.channel.send('Je kanaal is veranderd naar een **nojoin** lobby');
    }
  }
});

router.use('category', async ({ category, params, msg }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Je kan dit commando alleen op servers gebruiken');
    return;
  }

  if (params.length === 0) {
    if (category && category.isLobbyCategory) msg.channel.send('Je mag lobbies aanmaken in deze categorie');
    else msg.channel.send('Je mag geen lobbies aanmaken in deze categorie');
    return;
  }

  if (params.length > 1) {
    msg.channel.send('Ik verwacht maar één argument');
    return;
  }

  if (typeof params[0] !== 'string') {
    msg.channel.send('Ik verwacht een string als argument');
    return;
  }

  if (!msg.member.hasPermission('ADMINISTRATOR')) {
    msg.channel.send('Alleen een Edwin mag dit aanpassen');
    return;
  }

  if (!category) {
    msg.channel.send('Dit kanaal zit niet in een categorie');
    return;
  }

  let isAllowed : boolean;

  if (params[0].toLowerCase() === 'true' || params[0] === '1') isAllowed = true;
  else if (params[0].toLowerCase() === 'false' || params[0] === '0') isAllowed = false;
  else {
    msg.channel.send(`\`${params[0]}\` is niet een argument, verwacht \`true\` of \`false\``);
  }

  msg.channel.send(isAllowed ? 'Users kunnen nu lobbies aanmaken in deze category' : 'User kunnen nu geen lobbies meer aanmaken in deze category');

  const categoryRepo = getRepository(Category);
  await categoryRepo.save({ ...category, isLobbyCategory: isAllowed });
});

router.use('bitrate', async ({ msg, guildUser, params }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Je kan dit commando alleen op servers gebruiken');
    return;
  }

  if (params.length === 0) {
    msg.channel.send(`Lobby bitrate is ${guildUser.guild.bitrate}`);
    return;
  }

  if (params.length > 1) {
    msg.channel.send('Ik verwacht maar één argument');
    return;
  }

  if (typeof params[0] !== 'string') {
    msg.channel.send('Ik verwacht een string als argument');
    return;
  }

  if (!msg.member.hasPermission('ADMINISTRATOR')) {
    msg.channel.send('Alleen een Edwin mag dit aanpassen');
    return;
  }

  const newBitrate = Number(params[0]);

  if (Number.isNaN(newBitrate)) {
    msg.channel.send(`${params[0]} is niet een nummer`);
    return;
  }

  if (newBitrate > 128000) {
    msg.channel.send('Bitrate gaat tot 128000');
    return;
  }

  if (newBitrate < 8000) {
    msg.channel.send('Bitrate gaat boven 8000');
    return;
  }

  // eslint-disable-next-line no-param-reassign
  guildUser.guild.bitrate = newBitrate;

  await saveUserData(guildUser);
});

const helpHanlder : Handler = ({ msg }) => {
  let message = '**Maak een tijdelijke voice kanaal aan**';
  message += '\nMogelijke Commandos:';
  message += '\n`ei lobby create [@mention ...]`: Maak een lobby aan en laat alleen de toegestaande mensen joinen';
  message += '\n`ei lobby create [@mention ...] -nospeak`: Iedereen mag joinen, maar alleen toegestaande mensen mogen spreken';
  message += '\n`ei lobby add @mention ...`: Laat user(s) toe aan de lobby';
  message += '\n`ei lobby remove [@user ...]`: Verwijder user(s) uit de lobby';
  message += '\n`ei lobby type [nospeak/ nojoin]`: Verander het type van de lobby';
  message += '\n`*Admin* ei lobby category true/ false`: Sta users toe lobbies aan te maken in deze categorie';
  message += '\n`*Admin* ei lobby bitrate <8000 - 128000>`: Stel in welke bitrate de lobbies hebben wanneer ze worden aangemaakt';
  msg.channel.send(message);
};

router.use(null, helpHanlder);
router.use('help', helpHanlder);

router.onInit = async (client) => {
  const tempRepo = getRepository(TempChannel);

  setInterval(async () => {
    const tempChannels = await tempRepo.find();
    const now = new Date();

    tempChannels.forEach(async (tempChannel) => {
      const difference = now.getMinutes() - tempChannel.createdAt.getMinutes();
      if (difference >= 2) {
        const { guildUser } = tempChannel;
        const activeChannel = await activeTempChannel(guildUser, client);

        if (!activeChannel) tempRepo.remove(tempChannel);
        else if (!activeChannel.members.size) {
          activeChannel.delete().then(() => {
            tempRepo.remove(tempChannel);
          }).catch(console.error);
        } else if (!activeChannel.members.has(tempChannel.guildUser.user.id)) {
          const guildUsers = await Promise.all(activeChannel.members
            .map((member) => getUserGuildData(member.user, activeChannel.guild)));

          const tempsOfUsersNoUser = (await Promise.all(guildUsers.map((gu) => gu.tempChannel)))
            .filter((temp) => temp);

          const tempsOfUsers = await tempRepo.findByIds(tempsOfUsersNoUser.map((temp) => temp.id));

          const newOwner = activeChannel.members
            .sort((member1, member2) => member1.joinedTimestamp - member2.joinedTimestamp)
            .filter((member) => !(tempsOfUsers
              .some((temp) => temp.guildUser.user.id === member.id)
            ))
            .filter((member) => activeChannel.permissionOverwrites.has(member.id))
            .first();

          if (newOwner) {
            const updatedTemp = tempChannel;
            const newOwnerGuildUser = await getUserGuildData(newOwner.user, activeChannel.guild);
            updatedTemp.guildUser = newOwnerGuildUser;

            saveUserData(newOwnerGuildUser)
              .then(() => tempRepo.save(updatedTemp))
              .then(() => {
                const muted = activeChannel.permissionOverwrites.get(activeChannel.guild.id).allow.has('CONNECT');
                activeChannel.setName(generateLobbyName(muted, newOwner.user));

                newOwner.voice.setMute(false);

                newOwner.send('Jij bent nu de eigenaar van de lobby');
              })
              .catch(console.error);
          }
        }
      }
    });
  }, 1000 * 30);
};

export default router;
