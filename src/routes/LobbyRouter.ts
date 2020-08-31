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
  GuildMember,
  OverwriteResolvable,
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

enum ChannelType {
  Mute = 'mute',
  Public = 'public',
  Nojoin = 'private'
}

function generateLobbyName(type : ChannelType, owner : DiscordUser) {
  let icon : string;
  if (type === ChannelType.Nojoin) icon = '🔐';
  if (type === ChannelType.Mute) icon = '🔇';
  if (type === ChannelType.Public) icon = '🔊';
  return `${icon} ${owner.username}'s Lobby`;
}

function toDeny(type : ChannelType) {
  if (type === ChannelType.Mute) return [Permissions.FLAGS.SPEAK];
  if (type === ChannelType.Nojoin) return [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK];
  if (type === ChannelType.Public) return [];

  return [];
}

function getChannelType(channel : VoiceChannel) {
  if (!channel.permissionOverwrites.get(channel.guild.id).deny.has('CONNECT')) {
    if (!channel.permissionOverwrites.get(channel.guild.id).deny.has('SPEAK')) return ChannelType.Public;
    return ChannelType.Mute;
  } return ChannelType.Nojoin;
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: Array<DiscordUser | Role>, owner: DiscordUser,
  bot: DiscordUser,
  bitrate: number,
  type: ChannelType,
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

  const deny = toDeny(type);

  permissionOverwrites.push({
    id: guild.id,
    deny,
  });

  return guild.channels.create(generateLobbyName(type, owner), {
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

    let type = ChannelType.Nojoin;
    if (flags.some((flag) => flag.toLowerCase() === ChannelType.Mute)) type = ChannelType.Mute;
    if (flags.some((flag) => flag.toLowerCase() === ChannelType.Public)) type = ChannelType.Public;

    if (activeChannel) {
      msg.channel.send('Je hebt al een lobby');
    } else {
      try {
        const createdChannel = await createTempChannel(
          msg.guild,
          msg.channel.parentID,
          invited,
          msg.author,
          msg.client.user,
          guildUser.guild.bitrate,
          type,
        );

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
            msg.channel.send('Neem contact op met de server admins, waarschijnlijk staat de bitrate voor de lobbies te hoog');
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

  userOrRole.forEach((uOrR) => {
    if (activeChannel.permissionOverwrites.some((o) => uOrR.id === o.id)) {
      alreadyAllowedUsers.push(uOrR);
    } else {
      activeChannel.updateOverwrite(uOrR, {
        CONNECT: true,
        SPEAK: true,
      });

      allowedUsers.push(uOrR);

      if (uOrR instanceof DiscordUser) {
        activeChannel.members.get(uOrR.id)?.voice.setMute(false);
      } else {
        activeChannel.members
          .each((member) => { if (uOrR.members.has(member.id)) member.voice.setMute(false); });
      }
    }
  });

  let allowedUsersMessage : string;
  if (!allowedUsers.length) allowedUsersMessage = 'Geen user(s) toegevoegd';
  else allowedUsersMessage = `${allowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${allowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? 'mogen' : 'mag'} nu naar binnen`;

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = `${alreadyAllowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${alreadyAllowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? 'konden' : 'kon'} al naar binnen`;

  msg.channel.send(`${allowedUsersMessage}\n${alreadyInMessage}`);
});

router.use('remove', async ({ params, msg, guildUser }) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('Dit commando kan alleen gebruikt worden op een server');
    return;
  }

  const nonUsersOrRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);
  const roles = params.filter((param): param is Role => param instanceof Role);

  if (nonUsersOrRoles.length > 0) {
    msg.channel.send('Alleen mention(s) mogelijk als argument');
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

  if (getChannelType(activeChannel) === ChannelType.Public) {
    msg.channel.send('Wat snap jij niet aan een **public** lobby smeerjoch');
    return;
  }

  const usersGivenPermissions : GuildMember[] = [];

  roles.forEach((role) => {
    if (activeChannel.permissionOverwrites.has(role.id)) {
      role.members.forEach((member) => {
        // eslint-disable-next-line max-len
        if (!activeChannel.permissionOverwrites.has(member.id)
        && activeChannel.members.has(member.id)
        && !users.some((user) => user.id === member.id)) {
          activeChannel.updateOverwrite(member.id, { CONNECT: true, SPEAK: true });
          usersGivenPermissions.push(member);
        }
      });
    }

    activeChannel.permissionOverwrites.get(role.id)?.delete();
  });

  let triedRemoveSelf = false;
  let triedRemoveEi = false;
  const removedList : DiscordUser[] = [];
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

      if (removed) removedList.push(user);
    }

    return !removed;
  });

  let message = '';

  if (usersGivenPermissions.length > 0) {
    message += `Omdat ${usersGivenPermissions.map((user) => user.displayName).join(', ')} ${roles.length > 1 ? 'één of meer van de rollen' : 'de rol'} ${usersGivenPermissions.length > 1 ? 'hadden zijn ze' : 'had is hij'} niet verwijderd.`;
    message += `\nVerwijder ${usersGivenPermissions.length > 1 ? 'hen' : 'hem'} met \`ei lobby remove ${usersGivenPermissions.map((member) => `@${member.user.tag}`).join(' ')}\``;
  }

  if (notRemoved.length > 0) {
    if (triedRemoveSelf) message += '\nJe kan jezelf niet verwijderen';
    if (triedRemoveEi) message += '\nEi Noah is omnipresent';
    else message += `\n${notRemoved.map((user) => user.username).join(', ')} ${notRemoved.length > 1 ? 'konden' : 'kon'} niet verwijderd worden`;
  } else if (removedList.length) {
    message += `\n${removedList.map((user) => user.username).join(', ')} ${removedList.length > 1 ? 'zijn' : 'is'} verwijderd uit de lobby`;
  }

  msg.channel.send(message);
});

const changeTypeHandler : Handler = async ({ params, msg, guildUser }) => {
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

  const type = getChannelType(activeChannel);

  if (params.length !== 1) {
    if (type === ChannelType.Mute) msg.channel.send(`Type van lobby is \`${ChannelType.Mute}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Nojoin}\``);
    else if (type === ChannelType.Nojoin) msg.channel.send(`Type van lobby is \`${ChannelType.Nojoin}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Mute}\``);
    else msg.channel.send(`Type van lobby is \`${ChannelType.Public}\` andere types zijn \`${ChannelType.Mute}\` en \`${ChannelType.Nojoin}\``);
  } else if (params.length === 1) {
    if (typeof params[0] !== 'string') {
      msg.channel.send('Ik verwachte hier geen **mention**');
      return;
    }

    const [changeTo] = <ChannelType[]>params;

    if (!Object.values(ChannelType).includes(changeTo)) {
      msg.channel.send(`*${params[0]}* is niet een lobby type`);
      return;
    }

    if (changeTo === type) {
      msg.channel.send(`Je lobby was al een **${type}** lobby`);
      return;
    }

    const deny = toDeny(changeTo);

    const newOverwrites = type === ChannelType.Public ? activeChannel.members
      .filter((member) => !activeChannel.permissionOverwrites.has(member.id))
      .map((member) : OverwriteResolvable => ({ id: member.id, allow: ['SPEAK', 'CONNECT'] })) : [];

    if (type === ChannelType.Mute && changeTo === ChannelType.Public) {
      activeChannel.members
        .filter((member) => !activeChannel.permissionOverwrites.has(member.id))
        .forEach((member) => member.voice.setMute(false));
    } else if (type === ChannelType.Mute && changeTo === ChannelType.Nojoin) {
      activeChannel.members
        .filter((member) => !activeChannel.permissionOverwrites.has(member.id))
        .forEach((member) => {
          member.voice.setChannel(null);
          member.send(`Je bent verwijderd uit *${msg.author.username}'s*, omdat de lobby was veranderd naar ${changeTo} en jij nog geen toestemming had gekregen`);
        });
    }

    activeChannel.overwritePermissions([
      ...activeChannel.permissionOverwrites.array(),
      { id: msg.guild.id, deny },
      ...newOverwrites,
    ]).then((channel) => {
      channel.setName(generateLobbyName(changeTo, msg.author)).catch((err) => console.error('Change name error', err));
      msg.channel.send(`Lobby type is veranderd naar *${changeTo}*`).catch((err) => console.error('Send message error', err));
    }).catch((err) => console.error('Overwrite error', err));
  }
};

router.use('type', changeTypeHandler);
router.use('change', changeTypeHandler);
router.use('set', changeTypeHandler);

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
  message += '\n`ei lobby create [@mention ...]`: Maak een private lobby aan en laat alleen de toegestaande mensen joinen';
  message += '\n`ei lobby create [@mention ...] -mute`: Iedereen mag joinen, maar alleen toegestaande mensen mogen spreken';
  message += '\n`ei lobby create [@mention ...] -public`: Iedereen mag joinen';
  message += '\n`ei lobby add @mention ...`: Laat user(s) toe aan de lobby';
  message += '\n`ei lobby remove [@mention ...]`: Verwijder user(s)/ role(s) uit de lobby';
  message += '\n`ei lobby set [mute / private / public]`: Verander het type van de lobby';
  message += '\n`*Admin* ei lobby category true/ false`: Sta users toe lobbies aan te maken in deze categorie';
  message += '\n`*Admin* ei lobby bitrate <8000 - 128000>`: Stel in welke bitrate de lobbies hebben wanneer ze worden aangemaakt';
  msg.channel.send(message);
};

router.use(null, helpHanlder);
router.use('help', helpHanlder);

router.onInit = async (client) => {
  const tempRepo = getRepository(TempChannel);

  const checkTempLobbies = async () => {
    const tempChannels = await tempRepo.find();
    const now = new Date();

    console.log(`Started lobby check ${now.toISOString()}`);

    const tempChecks = tempChannels.map(async (tempChannel) => {
      const difference = now.getMinutes() - tempChannel.createdAt.getMinutes();
      if (difference >= 2) {
        const { guildUser } = tempChannel;
        const activeChannel = await activeTempChannel(guildUser, client);

        if (!activeChannel) {
          await tempRepo.remove(tempChannel);
          console.log('Lobby bestond niet meer');
        } else if (!activeChannel.members.size) {
          await activeChannel.delete().then(() => {
            console.log('Verwijderd: Niemand in lobby');
            return tempRepo.remove(tempChannel);
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
            // eslint-disable-next-line max-len
            .filter((member) => getChannelType(activeChannel) === ChannelType.Public || activeChannel.permissionOverwrites.has(member.id))
            .first();

          if (newOwner) {
            const updatedTemp = tempChannel;
            const newOwnerGuildUser = await getUserGuildData(newOwner.user, activeChannel.guild);
            updatedTemp.guildUser = newOwnerGuildUser;

            activeChannel.updateOverwrite(newOwner, { SPEAK: true, CONNECT: true });

            await saveUserData(newOwnerGuildUser)
              .then(() => tempRepo.save(updatedTemp))
              .then(() => {
                const type = getChannelType(activeChannel);
                activeChannel.setName(generateLobbyName(type, newOwner.user));

                newOwner.voice.setMute(false);

                newOwner.send('Jij bent nu de eigenaar van de lobby');
                console.log('Ownership is overgedragen');
              })
              .catch(console.error);
          } else { console.log('Owner is weggegaan, maar niemand kwam in aanmerking om de nieuwe leider te worden'); }
        }
      }
    });

    await Promise.all(tempChecks);

    setTimeout(checkTempLobbies, 1000);
  };

  checkTempLobbies();
};

export default router;
