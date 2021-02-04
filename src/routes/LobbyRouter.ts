/* eslint-disable no-param-reassign */
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
  TextBasedChannelFields,
  OverwriteResolvable,
  TextChannel,
} from 'discord.js';
import { EntityManager } from '@mikro-orm/core';
import emojiRegex from 'emoji-regex';
import TempChannel from '../entity/TempChannel';
import createMenu from '../createMenu';
import { getUserGuildData } from '../data';
import { GuildUser } from '../entity/GuildUser';
import Router, { Handler } from '../Router';

const router = new Router();

enum ChannelType {
  Mute = 'mute',
  Public = 'public',
  Nojoin = 'private'
}

function generateLobbyName(
  type : ChannelType,
  owner : DiscordUser,
  guildUser : GuildUser,
  textChat?: boolean,
) : string {
  let icon : string = '🔊';
  if (type === ChannelType.Nojoin) icon = '🔐';
  if (type === ChannelType.Mute) icon = '🙊';

  if (type === 'public') {
    if (guildUser.tempChannel?.name) {
      const result = emojiRegex().exec(guildUser.tempChannel.name);
      if (result && result[0] === guildUser.tempChannel.name.substr(0, result[0].length)) {
        const [customIcon] = result;

        if (customIcon !== '🔐' && customIcon !== '🙊') {
          const name = guildUser.tempChannel.name
            .substring(result[0].length, guildUser.tempChannel.name.length)
            .trim();

          if (textChat) return `${customIcon}${name} chat`;
          return `${customIcon} ${name}`;
        }
      }
    }
  }

  if (textChat) return `${icon}${guildUser.tempChannel?.name || `${owner.username}`} chat`;
  return `${icon} ${guildUser.tempChannel?.name || `${owner.username}'s Lobby`}`;
}

function toDeny(type : ChannelType) {
  if (type === ChannelType.Mute) return [Permissions.FLAGS.SPEAK];
  if (type === ChannelType.Nojoin) return [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK];
  if (type === ChannelType.Public) return [];

  return [];
}

function toDenyText(type : ChannelType) {
  if (type === ChannelType.Mute) return [Permissions.FLAGS.SEND_MESSAGES];
  if (type === ChannelType.Nojoin) return [Permissions.FLAGS.VIEW_CHANNEL];
  if (type === ChannelType.Public) return [];

  return [];
}

function getChannelType(channel : VoiceChannel) {
  if (!channel.permissionOverwrites.get(channel.guild.id)?.deny.has('CONNECT')) {
    if (!channel.permissionOverwrites.get(channel.guild.id)?.deny.has('SPEAK')) return ChannelType.Public;
    return ChannelType.Mute;
  } return ChannelType.Nojoin;
}

async function createTempChannel(
  guild: DiscordGuild, parent: string,
  users: Array<DiscordUser | Role>, owner: DiscordUser,
  bitrate: number,
  type: ChannelType,
  userLimit = 0,
  guildUser : GuildUser,
) {
  const userSnowflakes = [...new Set([...users.map((user) => user.id), owner.id])];

  const permissionOverwrites : OverwriteData[] = userSnowflakes.map((id) => ({
    id,
    allow: [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK],
  }));

  const bot = guild.client.user;

  if (bot !== null) {
    permissionOverwrites.push({
      id: bot.id,
      allow: [
        Permissions.FLAGS.CONNECT,
        Permissions.FLAGS.SPEAK,
        Permissions.FLAGS.MUTE_MEMBERS,
        Permissions.FLAGS.MOVE_MEMBERS,
        Permissions.FLAGS.DEAFEN_MEMBERS,
        Permissions.FLAGS.MANAGE_CHANNELS,
      ],
    });
  }

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

  return guild.channels.create(generateLobbyName(type, owner, guildUser), {
    type: 'voice',
    permissionOverwrites,
    parent,
    bitrate,
    userLimit,
  });
}

async function activeTempChannel(client : Client, em : EntityManager, tempChannel ?: TempChannel) {
  if (!tempChannel) return undefined;

  try {
    const activeChannel = await client.channels.fetch(tempChannel.channelId, false);
    if (activeChannel instanceof VoiceChannel) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) {
        await em.remove(tempChannel).flush();
        return undefined;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return undefined;
}

async function activeTempText(client : Client, tempChannel : TempChannel) {
  if (!tempChannel || !tempChannel.textChannelId) return undefined;

  try {
    const activeChannel = await client.channels.fetch(tempChannel.textChannelId, false);
    if (activeChannel instanceof TextChannel) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) {
        tempChannel.textChannelId = undefined;
        return undefined;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return undefined;
}

function getTextPermissionOverwrites(voice : VoiceChannel) : OverwriteData[] {
  return voice.permissionOverwrites.map((overwrite) : OverwriteData => {
    if (overwrite.id === voice.guild.id) {
      return {
        id: overwrite.id,
        deny: toDenyText(getChannelType(voice)),
      };
    }

    return {
      allow: [Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL],
      id: overwrite.id,
    };
  });
}

async function createTextChannel(
  client : Client,
  em : EntityManager,
  tempChannel : TempChannel,
  owner : DiscordUser,
) : Promise<TextChannel> {
  const voiceChannel = await activeTempChannel(client, em, tempChannel);
  if (!voiceChannel) throw Error('There is no active temp channel');

  const permissionOverwrites : OverwriteData[] = [
    ...getTextPermissionOverwrites(voiceChannel),
    {
      id: voiceChannel.guild.id,
      deny: toDenyText(getChannelType(voiceChannel)),
    }];

  return voiceChannel.guild.channels.create(
    generateLobbyName(getChannelType(voiceChannel), owner, tempChannel.guildUser, true),
    {
      type: 'text',
      parent: voiceChannel.parent || undefined,
      permissionOverwrites,
      position: voiceChannel.calculatedPosition + 1,
    },
  );
}

async function updateTextChannel(voice : VoiceChannel, text : TextChannel) {
  text.edit({ permissionOverwrites: getTextPermissionOverwrites(voice) });
}

const createHandler : Handler = async ({
  msg, params, flags, guildUser, category, em,
}) => {
  const nonUsersAndRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const invited = params
    // eslint-disable-next-line max-len
    .filter((param): param is DiscordUser | Role => param instanceof DiscordUser || param instanceof Role)
    .filter((user) => user.id !== msg.author.id && user.id !== msg.client.user?.id);

  if (msg.channel instanceof DMChannel
    || msg.channel instanceof NewsChannel
    || msg.guild === null
    || guildUser === null) {
    return 'Je kan alleen lobbies aanmaken op een server';
  } if (!category || !category.isLobbyCategory || msg.channel.parentID === null) {
    return 'Je mag geen lobbies aanmaken in deze categorie';
  } if (nonUsersAndRoles.length) {
    return 'Alleen mentions mogelijk als argument(en)';
  }
  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  let type = ChannelType.Mute;
  if (flags.some((flag) => flag.toLowerCase() === ChannelType.Mute)) type = ChannelType.Mute;
  else if (flags.some((flag) => flag.toLowerCase() === ChannelType.Public)) {
    type = ChannelType.Public;
  } else if (flags.some((flag) => flag.toLowerCase() === ChannelType.Nojoin)) {
    type = ChannelType.Nojoin;
  }

  let userLimit = flags
    .map((flag) => Number.parseInt(flag, 10))
    .find((flag) => Number.isSafeInteger(flag));

  if (userLimit === undefined) {
    userLimit = 0;
  } else if (userLimit < 0) {
    userLimit = 0;
  } else if (userLimit > 99) {
    userLimit = 99;
  }

  if (activeChannel) {
    return 'Je hebt al een lobby';
  }
  try {
    guildUser.tempChannel = undefined;

    const createdChannel = await createTempChannel(
      msg.guild,
      msg.channel.parentID,
      invited,
      msg.author,
      guildUser.guild.bitrate,
      type,
      userLimit,
      guildUser,
    );

    const gu = guildUser;

    if (gu.tempChannel) { em.remove(gu.tempChannel); }
    gu.tempChannel = new TempChannel(createdChannel.id, gu);
    em.persist(gu.tempChannel);

    const textChannel = createTextChannel(msg.client, em, gu.tempChannel, msg.author);

    gu.tempChannel.textChannelId = (await textChannel).id;

    if (invited.length > 0) {
      return `Lobby aangemaakt voor ${invited.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} en jij`;
    } return 'Lobby aangemaakt';
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.code === Constants.APIErrors.INVALID_FORM_BODY) {
        return 'Neem contact op met de server admins, waarschijnlijk staat de bitrate voor de lobbies te hoog';
      }
      console.log(err);
      return 'Onverwachte DiscordAPIError';
    }
    console.error(err);
    return 'Onverwachte error';
  }
};

// ei lobby create ...
const createRouter = new Router();
router.use('create', createRouter);
router.use('aanmaken', createRouter);

createRouter.use(Role, createHandler);
createRouter.use(DiscordUser, createHandler);
createRouter.use(null, createHandler);

router.use('add', async ({
  params, msg, guildUser, em,
}) => {
  if (msg.channel instanceof DMChannel || guildUser === null) {
    return 'Dit commando kan alleen gebruikt worden op een server';
  }

  const nonUserOrRole = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const userOrRole = params
    // eslint-disable-next-line max-len
    .filter((param): param is DiscordUser | Role => param instanceof DiscordUser || param instanceof Role);

  if (nonUserOrRole.length > 0) {
    return ('Alleen user mention(s) mogelijk als argument');
  }

  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak deze aan met `ei lobby create`';
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    return 'Je lobby is aanwezig in een andere categorie dan deze';
  }

  const allowedUsers : Array<DiscordUser | Role> = [];
  const alreadyAllowedUsers : Array<DiscordUser | Role> = [];

  const overwritePromise : Promise<any>[] = [];

  userOrRole.forEach((uOrR) => {
    if (activeChannel.permissionOverwrites.some((o) => uOrR.id === o.id)) {
      alreadyAllowedUsers.push(uOrR);
    } else {
      overwritePromise.push(activeChannel.updateOverwrite(uOrR, {
        CONNECT: true,
        SPEAK: true,
      }));

      allowedUsers.push(uOrR);

      if (uOrR instanceof DiscordUser) {
        activeChannel.members.get(uOrR.id)?.voice.setMute(false);
      } else {
        activeChannel.members
          .each((member) => { if (uOrR.members.has(member.id)) member.voice.setMute(false); });
      }
    }
  });

  Promise.all(overwritePromise).then(async () => {
    if (guildUser.tempChannel) {
      const textChannel = await activeTempText(msg.client, guildUser.tempChannel);
      if (textChannel) updateTextChannel(activeChannel, textChannel);
    }
  });

  let allowedUsersMessage : string;
  if (!allowedUsers.length) allowedUsersMessage = 'Geen user(s) toegevoegd';
  else allowedUsersMessage = `${allowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${allowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? 'mogen' : 'mag'} nu naar binnen`;

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = `${alreadyAllowedUsers.map((user) => (user instanceof DiscordUser ? user.username : `${user.name}s`)).join(', ')} ${alreadyAllowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? 'konden' : 'kon'} al naar binnen`;

  return `${allowedUsersMessage}\n${alreadyInMessage}`;
});

const removeFromLobby = (
  channel : VoiceChannel,
  toRemoveUsers : DiscordUser[],
  toRemoveRoles : Role[],
  textChannel : TextBasedChannelFields,
  channelOwner : DiscordUser,
  tempChannel ?: TempChannel,
) => {
  const usersGivenPermissions : GuildMember[] = [];

  const rolesRemoved : Role[] = [];
  const rolesNotRemoved : Role[] = [];

  const deletePromises : Array<Promise<unknown> | undefined> = [];

  toRemoveRoles.forEach((role) => {
    const roleOverwrite = channel.permissionOverwrites.get(role.id);

    if (roleOverwrite) {
      role.members.forEach((member) => {
        // eslint-disable-next-line max-len
        if (!channel.permissionOverwrites.has(member.id)
        && channel.members.has(member.id)
        && !toRemoveUsers.some((user) => user.id === member.id)) {
          deletePromises.push(channel.updateOverwrite(member.id, { CONNECT: true, SPEAK: true }));
          usersGivenPermissions.push(member);
        }
      });

      deletePromises.push(roleOverwrite.delete());
      rolesRemoved.push(role);
    } else {
      rolesNotRemoved.push(role);
    }
  });

  let triedRemoveSelf = false;
  let triedRemoveEi = false;
  const removedList : DiscordUser[] = [];
  const notRemoved = toRemoveUsers.filter((user) => {
    let removed = false;
    if (user.id === channelOwner.id) triedRemoveSelf = true;
    else if (user.id === channelOwner.client.user?.id) triedRemoveEi = true;
    else {
      const member = channel.members.get(user.id);
      if (member && member.voice.channelID === channel.id) {
        member.voice.setChannel(null);
        removed = true;
      }

      if (channel.permissionOverwrites.has(user.id)) {
        deletePromises.push(channel.permissionOverwrites.get(user.id)?.delete());
        removed = true;
      }

      if (removed) removedList.push(user);
    }

    return !removed;
  });

  let message = '';

  if (usersGivenPermissions.length > 0) {
    message += `Omdat ${usersGivenPermissions.map((user) => user.displayName).join(', ')} ${toRemoveRoles.length > 1 ? 'één of meer van de rollen' : 'de rol'} ${usersGivenPermissions.length > 1 ? 'hadden zijn ze' : 'had is hij'} niet verwijderd.`;
    message += `\nVerwijder ${usersGivenPermissions.length > 1 ? 'hen' : 'hem'} met \`ei lobby remove ${usersGivenPermissions.map((member) => `@${member.user.tag}`).join(' ')}\``;
  }

  if (notRemoved.length > 0) {
    if (triedRemoveSelf) message += '\nJe kan jezelf niet verwijderen';
    if (triedRemoveEi) message += '\nEi Noah is omnipresent';
    else message += `\n${notRemoved.map((user) => user.username).join(', ')} ${notRemoved.length > 1 ? 'konden' : 'kon'} niet verwijderd worden`;
  } else if (removedList.length) {
    message += `\n${removedList.map((user) => user.username).join(', ')} ${removedList.length > 1 ? 'zijn' : 'is'} verwijderd uit de lobby`;
  }

  if (rolesRemoved.length > 0) {
    const roleNames = rolesRemoved.map((role) => role.name);
    message += `\n${roleNames.join(', ')} rol${roleNames.length > 1 ? 'len zijn verwijderd' : ' is verwijderd'}`;
  }

  if (rolesNotRemoved.length > 0) {
    const roleNames = rolesNotRemoved.map((role) => role.name);
    message += `\nRol${rolesNotRemoved.length > 1 ? 'len' : ''} ${roleNames.join(', ')} ${rolesNotRemoved.length > 1 ? 'zijn niet verwijderd' : 'is niet verwijderd'}`;
  }

  Promise.all(deletePromises).then(() => {
    if (tempChannel) {
      const tempText = activeTempText(channel.client, tempChannel);
      tempText.then((text) => { if (text) updateTextChannel(channel, text); });
    }
  });

  if (message === '') {
    textChannel.send('Geen users of roles gegeven');
  } else {
    textChannel.send(message);
  }
};

router.use('remove', async ({
  params, msg, guildUser, em,
}) => {
  if (msg.channel instanceof DMChannel || guildUser === null || msg.guild == null) {
    return 'Dit commando kan alleen gebruikt worden op een server';
  }

  const nonUsersOrRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);
  const roles = params.filter((param): param is Role => param instanceof Role);

  if (nonUsersOrRoles.length > 0) {
    return 'Alleen mention(s) mogelijk als argument';
  }

  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel || !guildUser.tempChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`';
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    return 'Je lobby is aanwezig in een andere categorie dan deze';
  }

  if (getChannelType(activeChannel) === ChannelType.Public) {
    return 'Wat snap jij niet aan een **public** lobby smeerjoch';
  }

  if (params.length === 0) {
    const removeAbleRoles = msg.guild.roles.cache.array()
      .filter((role) => activeChannel.permissionOverwrites.has(role.id))
      .filter((role) => role.id !== msg.guild?.id);

    const removeAbleUsers = msg.guild.members.cache.array()
      .filter((member) => {
        if (member.id === msg.author.id) return false;
        if (member.id === msg.client.user?.id) return false;
        if (activeChannel.permissionOverwrites.has(member.id)) return true;
        if (activeChannel.members.has(member.id)) return true;
        return false;
      })
      .map((member) => member.user);

    if (removeAbleUsers.length === 0 && removeAbleRoles.length === 0) {
      return 'Geen gebruikers of roles die verwijderd kunnen worden';
    }

    const selectedUsers = new Set<DiscordUser>();
    const selectedRoles = new Set<Role>();

    createMenu([...removeAbleRoles, ...removeAbleUsers], msg.author, msg.channel, 'Welke user(s) of role(s) wil je verwijderen',
      (item) => {
        if (item instanceof DiscordUser) {
          return `${selectedUsers.has(item) ? '✅' : ''}User: ${item.username}`;
        }

        return `${selectedRoles.has(item) ? '✅' : ''}Role: ${item.name}`;
      },
      (selected) => {
        if (selected instanceof DiscordUser) {
          if (selectedUsers.has(selected)) selectedUsers.delete(selected);
          else selectedUsers.add(selected);
        } else if (selectedRoles.has(selected)) selectedRoles.delete(selected);
        else selectedRoles.add(selected);

        return false;
      },
      ['❌', () => {
        removeFromLobby(activeChannel,
          Array.from(selectedUsers),
          Array.from(selectedRoles),
          msg.channel,
          msg.author,
          guildUser.tempChannel);
      }]);
    return null;
  }

  removeFromLobby(activeChannel, users, roles, msg.channel, msg.author, guildUser.tempChannel);
  return null;
});

const changeTypeHandler : Handler = async ({
  params, msg, guildUser, em,
}) => {
  if (msg.channel instanceof DMChannel || msg.guild === null || guildUser === null) {
    return 'Dit commando kan alleen op servers worden gebruikt';
  }
  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel || !guildUser.tempChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`';
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    return 'Je lobby is aanwezig in een andere categorie dan deze';
  }

  if (params.length > 1) {
    return 'Ik verwachte niet meer dan **één** argument';
  }

  const type = getChannelType(activeChannel);

  if (params.length !== 1) {
    if (type === ChannelType.Mute) return `Type van lobby is \`${ChannelType.Mute}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Nojoin}\``;
    if (type === ChannelType.Nojoin) return `Type van lobby is \`${ChannelType.Nojoin}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Mute}\``;
    return `Type van lobby is \`${ChannelType.Public}\` andere types zijn \`${ChannelType.Mute}\` en \`${ChannelType.Nojoin}\``;
  } if (params.length === 1) {
    if (typeof params[0] !== 'string') {
      return 'Ik verwachte hier geen **mention**';
    }

    const [changeTo] = <ChannelType[]>params;

    if (!Object.values(ChannelType).includes(changeTo)) {
      return `*${params[0]}* is niet een lobby type`;
    }

    if (changeTo === type) {
      return `Je lobby was al een **${type}** lobby`;
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
    ]).catch(console.error);

    activeChannel.setName(generateLobbyName(changeTo, msg.author, guildUser))
      .then((voice) => {
        if (guildUser.tempChannel) {
          activeTempText(msg.client, guildUser.tempChannel)
            .then(async (textChannel) => {
              if (textChannel) {
                await textChannel.setName(generateLobbyName(changeTo, msg.author, guildUser, true));
                updateTextChannel(voice, textChannel);
              }
            });
        }
      })
      .catch((err) => console.error('Change name error', err));

    return `Lobby type is veranderd naar *${changeTo}*`;
  }

  return 'Stuur een berichtje naar een ei-noah dev als je dit bericht ziet';
};

router.use('type', changeTypeHandler);
router.use('change', changeTypeHandler);
router.use('set', changeTypeHandler);
router.use('verander', changeTypeHandler);

const sizeHandler : Handler = async ({
  msg, category, guildUser, params, em,
}) => {
  if (msg.channel instanceof DMChannel || guildUser === null) {
    return 'Je kan dit commando alleen op servers gebruiken';
  }

  if (!category || !category.isLobbyCategory) {
    return 'Dit is geen lobby category';
  }

  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`';
  }

  if (activeChannel.parentID !== msg.channel.parentID) {
    return 'Je lobby is aanwezig in een andere categorie dan deze';
  }

  if (params.length === 0) {
    return 'Geen één (1) argument gegeven';
  }

  if (params.length > 1) {
    return 'Ik verwachte maar één (1) argument';
  }

  const sizeParam = params[0];

  if (typeof sizeParam !== 'string') {
    return 'Lijkt dat op een nummer??';
  }

  let size = Number.parseInt(sizeParam, 10);

  if (sizeParam.toLowerCase() === 'none' || sizeParam.toLowerCase() === 'remove') {
    size = 0;
  }

  if (!Number.isSafeInteger(size)) {
    return 'Even een normaal nummer alstublieft';
  }

  if (size > 99) { size = 99; }
  size = Math.abs(size);

  await activeChannel.setUserLimit(size);

  if (size === 0) { return 'Limiet is verwijderd'; } return `Limiet veranderd naar ${size}`;
};

router.use('size', sizeHandler);
router.use('limit', sizeHandler);
router.use('userlimit', sizeHandler);

router.use('category', async ({ category, params, msg }) => {
  const ca = category;
  if (msg.channel instanceof DMChannel) {
    return 'Je kan dit commando alleen op servers gebruiken';
  }

  if (params.length === 0) {
    if (category && category.isLobbyCategory) return 'Je mag lobbies aanmaken in deze categorie';
    return 'Je mag geen lobbies aanmaken in deze categorie';
  }

  if (params.length > 1) {
    return 'Ik verwacht maar één argument';
  }

  if (typeof params[0] !== 'string') {
    return 'Ik verwacht een string als argument';
  }

  if (!msg.member?.hasPermission('ADMINISTRATOR')) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  if (!category) {
    return 'Dit kanaal zit niet in een categorie';
  }

  let isAllowed : boolean;

  if (params[0].toLowerCase() === 'true' || params[0] === '1') isAllowed = true;
  else if (params[0].toLowerCase() === 'false' || params[0] === '0') isAllowed = false;
  else {
    return `\`${params[0]}\` is niet een argument, verwacht \`true\` of \`false\``;
  }

  if (ca) { ca.isLobbyCategory = isAllowed; }

  return isAllowed ? 'Users kunnen nu lobbies aanmaken in deze category' : 'User kunnen nu geen lobbies meer aanmaken in deze category';
});

router.use('bitrate', async ({ msg, guildUser, params }) => {
  if (msg.channel instanceof DMChannel || guildUser === null) {
    return 'Je kan dit commando alleen op servers gebruiken';
  }

  if (params.length === 0) {
    return `Lobby bitrate is ${guildUser.guild.bitrate}`;
  }

  if (params.length > 1) {
    return 'Ik verwacht maar één argument';
  }

  if (typeof params[0] !== 'string') {
    return 'Ik verwacht een string als argument';
  }

  if (!msg.member?.hasPermission('ADMINISTRATOR')) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  const newBitrate = Number(params[0]);

  if (Number.isNaN(newBitrate)) {
    return `${params[0]} is niet een nummer`;
  }

  if (newBitrate > 128000) {
    return 'Bitrate gaat tot 128000';
  }

  if (newBitrate < 8000) {
    return 'Bitrate gaat boven 8000';
  }

  // eslint-disable-next-line no-param-reassign
  guildUser.guild.bitrate = newBitrate;

  return `Bitrate veranderd naar ${newBitrate}`;
});

const nameHandler : Handler = async ({
  params, guildUser, category, msg, em,
}) => {
  if (!guildUser || !category) return 'Dit commando kan alleen op een server worden gebruikt';
  if (!category.isLobbyCategory) return 'Je kan geen lobbies aanmaken in deze categorie';

  if (!params.length) return 'Geef een naam in';

  const tempChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!tempChannel || !guildUser.tempChannel) return 'Je moet een lobby hebben om dit commando te kunnen gebruiken';

  const nameArray = params.filter((param) : param is string => typeof param === 'string');
  if (nameArray.length !== params.length) return 'Je mag alleen tekst gebruiken in de naam';

  const name = nameArray.join(' ');

  if (name.length > 98) return 'De naam mag niet langer zijn dan 98 tekens';

  guildUser.tempChannel.name = name;
  const type = getChannelType(tempChannel);
  tempChannel.setName(generateLobbyName(type, msg.author, guildUser));
  activeTempText(msg.client, guildUser.tempChannel)
    .then((tc) => tc?.setName(generateLobbyName(type, msg.author, guildUser, true)));

  return 'Lobby naam is aangepast\n> Bij overmatig gebruik kan het meer dan 10 minuten duren';
};

router.use('name', nameHandler);
router.use('rename', nameHandler);
router.use('naam', nameHandler);
router.use('hernoem', nameHandler);

const chatHandler : Handler = async ({ guildUser, em, msg }) => {
  if (!guildUser) return 'Je kan dit commando alleen op een server gebruiken';

  const activeVoice = await activeTempChannel(msg.client, em, guildUser?.tempChannel);
  if (!activeVoice || !guildUser.tempChannel) return 'Je hebt nog geen voice-channel, maak er één aan met `ei lobby create`';

  const activeText = await activeTempText(msg.client, guildUser.tempChannel);
  if (activeText) return `Er is al een chat: ${activeText}`;

  const newTextChat = await createTextChannel(msg.client, em, guildUser.tempChannel, msg.author);

  guildUser.tempChannel.textChannelId = newTextChat.id;
  return `Tekstkanaal aangemaakt: ${newTextChat}`;
};

router.use('text', chatHandler);
router.use('chat', chatHandler);

const helpHanlder : Handler = () => [
  '**Maak een tijdelijke voice kanaal aan**',
  'Mogelijke Commandos:',
  '`ei lobby create [@mention ...]`: Maak een private lobby aan en laat alleen de toegestaande mensen joinen',
  '`ei lobby create [@mention ...] -mute`: Iedereen mag joinen, maar alleen toegestaande mensen mogen spreken',
  '`ei lobby create [@mention ...] -public`: Iedereen mag joinen',
  '`ei lobby create [@mention ...] -<nummer>`: Zet een user limit op de lobby',
  '`ei lobby add @mention ...`: Laat user(s) toe aan de lobby',
  '`ei lobby remove [@mention ...]`: Verwijder user(s)/ role(s) uit de lobby',
  '`ei lobby set [mute / private / public]`: Verander het type van de lobby',
  '`ei lobby limit <nummer>`: Verander de lobby user limit',
  '`*Admin* ei lobby category true/ false`: Sta users toe lobbies aan te maken in deze categorie',
  '`*Admin* ei lobby bitrate <8000 - 128000>`: Stel in welke bitrate de lobbies hebben wanneer ze worden aangemaakt',
].join('\n');

router.use(null, helpHanlder);
router.use('help', helpHanlder);

router.onInit = async (client, orm) => {
  const checkTempChannel = async (tempChannel: TempChannel,
    em : EntityManager, respectTimeLimit = true) => {
    const now = new Date();

    const difference = Math.abs(now.getMinutes() - tempChannel.createdAt.getMinutes());
    if (!respectTimeLimit || difference >= 2) {
      const activeChannel = await activeTempChannel(client, em, tempChannel);
      const activeTextChannel = await activeTempText(client, tempChannel);

      if (!activeChannel) {
        em.remove(tempChannel);
        console.log('Lobby bestond niet meer');
      } else if (!activeChannel.members.size) {
        await activeChannel.delete();

        if (activeTextChannel) await activeTextChannel.delete();
        console.log('Verwijderd: Niemand in lobby');
        em.remove(tempChannel);
      } else if (!activeChannel.members.has(tempChannel.guildUser.user.id)) {
        const guildUsers = await Promise.all(activeChannel.members
          .map((member) => getUserGuildData(em, member.user, activeChannel.guild)));

        const newOwner = activeChannel.members
          .sort(
            (member1, member2) => (member1.joinedTimestamp || 0) - (member2.joinedTimestamp || 0),
          )
          .filter((member) => !guildUsers.find((gu) => gu.user.id === member.id)?.tempChannel)
          .filter((member) => {
            const isPublic = getChannelType(activeChannel) === ChannelType.Public;
            const isAllowedUser = activeChannel.permissionOverwrites.has(member.id);
            const hasAllowedRole = activeChannel.permissionOverwrites
              .some((overwrite) => overwrite.id !== activeChannel.guild.id
              && member.roles.cache.has(overwrite.id));

            return isPublic || isAllowedUser || hasAllowedRole;
          })
          .first();

        if (newOwner) {
          const newOwnerGuildUser = guildUsers.find((gu) => gu.user.id === newOwner.id);

          if (!newOwnerGuildUser) throw new Error('Guild User Not Found In Array');

          tempChannel.guildUser = newOwnerGuildUser;

          const type = getChannelType(activeChannel);

          await activeChannel.updateOverwrite(newOwner, { SPEAK: true, CONNECT: true })
            .catch(console.error);

          await Promise.all([
            activeChannel.setName(generateLobbyName(type, newOwner.user, newOwnerGuildUser)),
            activeTextChannel?.setName(
              generateLobbyName(type, newOwner.user, newOwnerGuildUser, true)
            ),
            newOwner.voice.setMute(false),
            newOwner.send('Jij bent nu de eigenaar van de lobby'),
          ]).catch(console.error);

          console.log('Ownership is overgedragen');
        } else { console.log('Owner is weggegaan, maar niemand kwam in aanmerking om de nieuwe leider te worden'); }
      } else {
        const discordUser = await client.users.fetch(tempChannel.guildUser.user.id);
        const lobbyType = getChannelType(activeChannel);

        const correctName = generateLobbyName(lobbyType, discordUser, tempChannel.guildUser);

        if (activeChannel.name !== correctName) {
          await activeChannel.setName(correctName);
        }
      }
    }
  };

  const checkTempLobbies = async () => {
    const em = orm.em.fork();

    const usersWithTemp = await em.getRepository(TempChannel).findAll();

    const tempChecks = usersWithTemp.map((tcs) => checkTempChannel(tcs, em));

    await Promise.all(tempChecks).catch(console.error);
    await em.flush().catch(console.error);

    setTimeout(checkTempLobbies, 1000 * 60);
  };

  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState?.channel && oldState.channel.id !== newState?.channel?.id) {
      const em = orm.em.fork();
      const tempChannel = await em.findOne(TempChannel, {
        channelId: oldState.channel.id,
      });
      if (tempChannel) await checkTempChannel(tempChannel, em, false);

      await em.flush().catch((err) => console.log(err));
    }
  });

  checkTempLobbies();
};

export default router;
