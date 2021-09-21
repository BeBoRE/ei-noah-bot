/* eslint-disable no-param-reassign */
import {
  User as DiscordUser,
  DMChannel,
  OverwriteData,
  Permissions,
  Guild as DiscordGuild,
  Client,
  VoiceChannel,
  DiscordAPIError,
  Role,
  GuildMember,
  OverwriteResolvable,
  TextChannel,
  CategoryChannel,
  Channel,
  User,
  Snowflake,
  Message,
  MessageActionRow,
  MessageButton,
  Guild,
  MessageComponentInteraction,
  InteractionCollector,
  MessageSelectMenu,
  MessageSelectOptionData,
} from 'discord.js';
import {
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import {
  EntityManager,
} from '@mikro-orm/postgresql';
import emojiRegex from 'emoji-regex';
import moment, { Duration } from 'moment';
import { i18n as I18n } from 'i18next';
import LobbyNameChange from '../entity/LobbyNameChange';
import { Category } from '../entity/Category';
import TempChannel from '../entity/TempChannel';
import createMenu from '../createMenu';
import { getCategoryData, getUserGuildData } from '../data';
import { GuildUser } from '../entity/GuildUser';
import Router, { GuildHandler, HandlerType } from '../router/Router';

const router = new Router('Beheer jouw lobby (kan alleen in het tekstkanaal van jou eigen lobby)');

enum ChannelType {
  Public = 'public',
  Mute = 'mute',
  Nojoin = 'private'
}

function getIcon(type : ChannelType) {
  if (type === ChannelType.Nojoin) return '🔐';
  if (type === ChannelType.Mute) return '🙊';
  return '🔊';
}

function generateLobbyName(
  type : ChannelType,
  owner : DiscordUser,
  newName ?: string,
  textChat?: boolean,
) : string | null {
  const icon = getIcon(type);

  if (newName) {
    const result = emojiRegex().exec(newName);
    if (result && result[0] === newName.substr(0, result[0].length)) {
      const [customIcon] = result;

      if (!Object.keys(ChannelType).map<string>((t) => getIcon(<ChannelType>t)).includes(customIcon) && customIcon !== '📝') {
        const name = newName
          .substring(result[0].length, newName.length)
          .trim();

        if (name.length <= 0 || name.length > 90) return null;

        if (textChat) return `${customIcon}${name} chat`;
        return `${customIcon} ${name}`;
      }
    }
  }

  if (textChat) return `📝${newName || `${owner.username}`} chat`;
  return `${icon} ${newName || `${owner.username}'s Lobby`}`;
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
  if (!channel.permissionOverwrites.resolve(channel.guild.id)?.deny.has('CONNECT')) {
    if (!channel.permissionOverwrites.resolve(channel.guild.id)?.deny.has('SPEAK')) return ChannelType.Public;
    return ChannelType.Mute;
  } return ChannelType.Nojoin;
}

async function createTempChannel(
  guild: DiscordGuild, parent: Snowflake,
  users: Array<DiscordUser | Role>, owner: DiscordUser,
  bitrate: number,
  type: ChannelType,
  userLimit = 0,
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

  const name = generateLobbyName(type, owner);

  if (!name) throw new Error('Invalid Name');

  return guild.channels.create(name, {
    type: 'GUILD_VOICE',
    permissionOverwrites,
    parent,
    bitrate,
    userLimit,
  });
}

async function activeTempChannel(client : Client, em : EntityManager, tempChannel ?: TempChannel) {
  if (!tempChannel) return undefined;
  if (!tempChannel.isInitialized()) await tempChannel.init();

  try {
    const activeChannel = await client.channels.fetch(`${BigInt(tempChannel.channelId)}`, { cache: true });
    if (activeChannel instanceof VoiceChannel) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) {
        em.remove(tempChannel);
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
    const activeChannel = await client.channels.fetch(`${BigInt(tempChannel.textChannelId)}`, { cache: true });
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
  return voice.permissionOverwrites.cache.map((overwrite) : OverwriteData => {
    if (overwrite.id === voice.guild.id) {
      return {
        id: overwrite.id,
        deny: toDenyText(getChannelType(voice)),
        type: overwrite.type,
      };
    }

    return {
      allow: [Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.ADD_REACTIONS, Permissions.FLAGS.READ_MESSAGE_HISTORY],
      id: overwrite.id,
      type: overwrite.type,
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

  const name = generateLobbyName(getChannelType(voiceChannel), owner, tempChannel.name, true);

  if (!name) throw new Error('Invalid Name');

  return voiceChannel.guild.channels.create(
    name,
    {
      type: 'GUILD_TEXT',
      parent: voiceChannel.parent || undefined,
      permissionOverwrites,
      position: voiceChannel.calculatedPosition + 1,
    },
  );
}

function updateTextChannel(voice : VoiceChannel, text : TextChannel) {
  return text.permissionOverwrites.set(getTextPermissionOverwrites(voice));
}

const createCreateChannel = (type : ChannelType, category : CategoryChannel) => {
  const typeName = `${type[0].toUpperCase()}${type.substring(1, type.length)}`;
  return category.guild.channels.create(`${getIcon(type)} Maak ${typeName} Lobby`, {
    type: 'GUILD_VOICE',
    parent: category,
  });
};

const getChannel = (client : Client, channelId ?: string) => new Promise<null | Channel>(
  (resolve) => {
    if (!channelId) { resolve(null); return; }
    client.channels.fetch(`${BigInt(channelId)}`, { cache: true })
      .then((channel) => resolve(channel))
      .catch(() => resolve(null))
      .finally(() => resolve(null));
  },
);

const createCreateChannels = async (category : Category, client : Client) => {
  const actualCategory = await client.channels.fetch(`${BigInt(category.id)}`, { cache: true });
  if (!(actualCategory instanceof CategoryChannel)) return;

  let publicVoice = await getChannel(client, category.publicVoice);
  if (publicVoice === null) {
    publicVoice = await createCreateChannel(ChannelType.Public, actualCategory);
    category.publicVoice = publicVoice.id;
  }

  let muteVoice = await getChannel(client, category.muteVoice);
  if (muteVoice === null) {
    muteVoice = await createCreateChannel(ChannelType.Mute, actualCategory);
    category.muteVoice = muteVoice.id;
  }

  let privateVoice = await getChannel(client, category.privateVoice);
  if (privateVoice === null) {
    privateVoice = await createCreateChannel(ChannelType.Nojoin, actualCategory);
    category.privateVoice = privateVoice.id;
  }
};

interface AddUsersResponse {
  allowedUsersOrRoles : Array<DiscordUser | Role>,
  alreadyAllowed : Array<DiscordUser | Role>,
  alreadyAllowedMessage: string,
  alreadyInMessage: string,
  text: string
}
const addUsers = (toAllow : Array<DiscordUser | Role>, activeChannel : VoiceChannel, owner : GuildUser, client : Client, i18n : I18n) : AddUsersResponse => {
  const allowedUsers : Array<DiscordUser | Role> = [];
  const alreadyAllowedUsers : Array<DiscordUser | Role> = [];

  toAllow.forEach((uOrR) => {
    if (activeChannel.permissionOverwrites.cache.some((o) => uOrR.id === o.id)) {
      alreadyAllowedUsers.push(uOrR);
      return;
    }
    allowedUsers.push(uOrR);

    if (uOrR instanceof DiscordUser) {
        activeChannel.members.get(uOrR.id)?.voice.setMute(false);
    } else {
      activeChannel.members
        .each((member) => { if (uOrR.members.has(member.id)) member.voice.setMute(false); });
    }
  });

  const newOverwrites : OverwriteResolvable[] = [...activeChannel.permissionOverwrites.cache.values(), ...allowedUsers.map((userOrRole) : OverwriteResolvable => ({
    id: userOrRole.id,
    allow: [
      'SPEAK',
      'CONNECT',
      'VIEW_CHANNEL',
    ],
  }))];

  activeChannel.permissionOverwrites.set(newOverwrites)
    .then(async (newChannel) => {
      if (owner.tempChannel) {
        const textChannel = await activeTempText(client, owner.tempChannel);
        if (textChannel && newChannel instanceof VoiceChannel) { updateTextChannel(newChannel, textChannel); }
      }
    })
    .catch(() => console.log('Overwrite permission error'));

  let allowedUsersMessage : string;
  if (!allowedUsers.length) allowedUsersMessage = i18n.t('lobby.noUsersAdded');
  else allowedUsersMessage = `${allowedUsers.map((userOrRole) => (userOrRole instanceof DiscordUser ? userOrRole : `${userOrRole}`)).join(', ')} ${allowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? i18n.t('lobby.canPlural') : i18n.t('lobby.can')} ${i18n.t('lobby.goIn')}`;

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = `${alreadyAllowedUsers.map((userOrRole) => (userOrRole instanceof DiscordUser ? userOrRole : `${userOrRole}`)).join(', ')} ${alreadyAllowedUsers.length > 1 || allowedUsers.some((user) => user instanceof Role) ? i18n.t('lobby.couldPlural') : i18n.t('lobby.could')} ${i18n.t('lobby.alreadyGoIn')}`;

  return {
    allowedUsersOrRoles: allowedUsers,
    alreadyAllowed: alreadyAllowedUsers,
    alreadyAllowedMessage: allowedUsersMessage,
    alreadyInMessage,
    text: `${allowedUsersMessage}\n${alreadyInMessage}`,
  };
};

router.use('add', async ({
  params, msg, guildUser, em, flags, i18n,
}) => {
  const nonUserOrRole = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const userOrRole = params
    // eslint-disable-next-line max-len
    .filter((param): param is DiscordUser | Role => param instanceof DiscordUser || param instanceof Role);

  flags.forEach((value) => {
    const [user] = value;

    if (user instanceof User || user instanceof Role) userOrRole.push(user);
  });

  if (nonUserOrRole.length > 0) {
    return (i18n.t('lobby.error.onlyMentions'));
  }

  if (!guildUser.tempChannel?.isInitialized()) await guildUser.tempChannel?.init();
  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel || !guildUser.tempChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (guildUser.tempChannel.textChannelId !== msg.channel.id) return i18n.t('lobby.error.useTextChannel', { channel: guildUser.tempChannel.textChannelId });

  return addUsers(userOrRole, activeChannel, guildUser, msg.client, i18n).text;
}, HandlerType.GUILD, {
  description: 'Add a user or role to the lobby',
  options: [{
    name: 'mention',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
    required: true,
  }, {
    name: '1',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '2',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '3',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '4',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '5',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '6',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '7',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '8',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '9',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '10',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '11',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '12',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '13',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '14',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }, {
    name: '15',
    description: 'User or role you want to add',
    type: 'MENTIONABLE',
  }],
});

router.useContext('Toevoegen aan lobby', 'USER', async ({
  interaction, guildUser, em, i18n,
}) => {
  if (!guildUser) return i18n.t('error.onlyUsableOnGuild');

  const activeChannel = guildUser.tempChannel && await activeTempChannel(interaction.client, em, guildUser.tempChannel);
  if (!guildUser.tempChannel || !activeChannel) return i18n.t('lobby.error.noLobby');

  const userToAdd = interaction.options.getUser('user', true);

  const addResponse = addUsers([userToAdd], activeChannel, guildUser, interaction.client, i18n);

  if (interaction.channel?.id !== guildUser.tempChannel.textChannelId) {
    const textChannel = await activeTempText(interaction.client, guildUser.tempChannel);

    if (addResponse.allowedUsersOrRoles.length && interaction.channel?.id !== textChannel?.id && interaction.client.user && textChannel?.permissionsFor(interaction.client.user)?.has('SEND_MESSAGES')) {
      textChannel.send(addResponse.alreadyAllowedMessage).catch(() => {});
    }

    return { ephemeral: true, content: addResponse.text };
  }

  return { ephemeral: !addResponse.allowedUsersOrRoles.length, content: addResponse.text };
});

const removeFromLobby = (
  channel : VoiceChannel,
  toRemoveUsers : DiscordUser[],
  toRemoveRoles : Role[],
  channelOwner : DiscordUser,
  tempChannel : TempChannel,
  i18n: I18n,
) => {
  const usersGivenPermissions : GuildMember[] = [];

  const rolesRemoved : Role[] = [];
  const rolesNotRemoved : Role[] = [];

  const deletePromises : Array<Promise<unknown> | undefined> = [];

  toRemoveRoles.forEach((role) => {
    const roleOverwrite = channel.permissionOverwrites.resolve(role.id);

    if (roleOverwrite) {
      role.members.forEach((member) => {
        // eslint-disable-next-line max-len
        if (!channel.permissionOverwrites.cache.has(member.id)
        && channel.members.has(member.id)
        && !toRemoveUsers.some((user) => user.id === member.id)) {
          deletePromises.push(channel.permissionOverwrites.edit(member.id, { CONNECT: true, SPEAK: true }));
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
      if (member && member.voice.channelId === channel.id) {
        member.voice.setChannel(null);
        removed = true;
      }

      if (channel.permissionOverwrites.cache.has(user.id)) {
        deletePromises.push(channel.permissionOverwrites.resolve(user.id)?.delete());
        removed = true;
      }

      if (removed) removedList.push(user);
    }

    return !removed;
  });

  let message = '';

  if (usersGivenPermissions.length) {
    if (usersGivenPermissions.length > 1) {
      if (rolesRemoved.length > 1) {
        message += i18n.t('lobby.rolePluralRemovalUserPluralNotRemoved', { users: usersGivenPermissions.join(', ') });
      } else {
        message += i18n.t('lobby.roleRemovalUserPluralNotRemoved', { users: usersGivenPermissions.join(', ') });
      }
    } else if (rolesRemoved.length > 1) {
      message += i18n.t('lobby.rolePluralRemovalUserNotRemoved', { users: usersGivenPermissions.join(', ') });
    } else {
      message += i18n.t('lobby.roleRemovalUserNotRemoved', { users: usersGivenPermissions.join(', ') });
    }
    message += i18n.t('lobby.removeThemWith', { users: usersGivenPermissions.map((member) => `@${member.user.tag}`).join(' ') });
  }

  if (notRemoved.length) {
    if (triedRemoveSelf) message += i18n.t('lobby.cantRemoveSelf');
    if (triedRemoveEi) message += i18n.t('lobby.cantRemoveEi');
    message += i18n.t('lobby.couldntBeRemoved', { users: notRemoved.join(', '), count: notRemoved.length });
  }

  if (removedList.length) {
    message += i18n.t('lobby.usersRemoved', { users: removedList.join(', '), count: removedList.length });
  }

  if (rolesRemoved.length) {
    message += i18n.t('lobby.rolesRemoved', { roles: rolesRemoved, count: rolesRemoved.length });
  }

  if (rolesNotRemoved.length) {
    message += i18n.t('lobby.rolesNotRemoved', { roles: rolesNotRemoved.join(', '), count: rolesNotRemoved.length });
  }

  Promise.all(deletePromises).then(() => {
    if (tempChannel) {
      const tempText = activeTempText(channel.client, tempChannel);
      tempText.then((text) => { if (text) updateTextChannel(channel, text); });
    }
  });

  return message;
};

router.use('remove', async ({
  params, msg, guildUser, em, flags, i18n,
}) => {
  const nonUsersOrRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);
  const roles = params.filter((param): param is Role => param instanceof Role);
  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  flags.forEach((value) => {
    const [user] = value;

    if (user instanceof User) users.push(user);
    if (user instanceof Role) roles.push(user);
  });

  if (nonUsersOrRoles.length > 0) {
    return i18n.t('lobby.error.onlyMentions');
  }

  if (guildUser.tempChannel?.isInitialized()) await guildUser.tempChannel.init();

  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!activeChannel || !guildUser.tempChannel || !guildUser.tempChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (guildUser.tempChannel.textChannelId !== msg.channel.id) return i18n.t('lobby.error.useTextChannel', { channel: guildUser.tempChannel.textChannelId });

  if (getChannelType(activeChannel) === ChannelType.Public) {
    return i18n.t('lobby.error.noRemoveInPublic');
  }

  await msg.guild.members.fetch();

  if (!users.length && !roles.length) {
    const removeAbleRoles = msg.guild.roles.cache
      .filter((role) => activeChannel.permissionOverwrites.cache.has(role.id))
      .filter((role) => role.id !== msg.guild?.id)
      .map((role) => role);

    const removeAbleUsers = msg.guild.members.cache
      .filter((member) => {
        if (member.id === requestingUser.id) return false;
        if (member.id === msg.client.user?.id) return false;
        if (activeChannel.permissionOverwrites.cache.has(member.id)) return true;
        if (activeChannel.members.has(member.id)) return true;
        return false;
      })
      .map((member) => member.user);

    if (removeAbleUsers.length === 0 && removeAbleRoles.length === 0) {
      return i18n.t('lobby.error.noUserToBeRemoved');
    }

    const selectedUsers = new Set<DiscordUser>();
    const selectedRoles = new Set<Role>();

    createMenu({
      list: [...removeAbleRoles, ...removeAbleUsers],
      owner: requestingUser,
      msg,
      title: i18n.t('lobby.roleRemovalTitle'),
      mapper: (item) => {
        if (item instanceof DiscordUser) {
          return `${selectedUsers.has(item) ? '✅' : ''}User: ${item.username}`;
        }

        return `${selectedRoles.has(item) ? '✅' : ''}Role: ${item.name}`;
      },
      selectCallback: (selected) => {
        if (selected instanceof DiscordUser) {
          if (selectedUsers.has(selected)) selectedUsers.delete(selected);
          else selectedUsers.add(selected);
        } else if (selectedRoles.has(selected)) selectedRoles.delete(selected);
        else selectedRoles.add(selected);

        return false;
      },
      extraButtons: [
        [new MessageButton({
          label: '❌',
          customId: 'delete',
          style: 'DANGER',
        }), () => {
          if (guildUser.tempChannel) {
            return removeFromLobby(activeChannel,
              Array.from(selectedUsers),
              Array.from(selectedRoles),
              requestingUser,
              guildUser.tempChannel,
              i18n);
          }

          return 'Lobby bestaat niet meer';
        }],
      ],
    });

    return null;
  }
  return removeFromLobby(activeChannel, users, roles, requestingUser, guildUser.tempChannel, i18n);
}, HandlerType.GUILD, {
  description: 'Remove selected users and roles from the lobby',
  options: [
    {
      name: 'mention',
      type: 'MENTIONABLE',
      description: 'Person or role to remove',
    }, {
      name: '1',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '2',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '3',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '4',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '5',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '6',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '7',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '8',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '9',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '10',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '11',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '12',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '13',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '14',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    }, {
      name: '15',
      description: 'Person or role to remove',
      type: 'MENTIONABLE',
    },
  ],
});

const memberCommandText = [
  '`/lobby add @mention...`: Laat user(s) toe aan de lobby',
  '`/lobby remove @mention...`: Verwijder user(s)/ role(s) uit de lobby',
  '`/lobby type [mute / private / public]`: Verander het type van de lobby',
  '`/lobby limit <nummer>`: Verander de lobby user limit',
  '`/lobby name <lobby naam>`: Geef de lobby een naam',
].join('\n');

const helpCommandText = [
  '**Maak een tijdelijke voice kanaal aan**',
  'Mogelijke Commandos:',
  memberCommandText,
  '`*Admin* /lobby create-category <category>`: Maak in gegeven categorie lobby-aanmaak-kanalen aan, verwijder deze kanalen door dezelfde categorie opnieuw te sturen',
  '`*Admin* /lobby category <create-category> <lobby-category>`: Verander de categorie waar de lobbies worden neergezet',
  '`*Admin* /lobby bitrate <8000 - 128000>`: Stel in welke bitrate de lobbies hebben wanneer ze worden aangemaakt',
].join('\n');

const dashBoardText = ['**Beheer je lobby met deze commands:**', memberCommandText].join('\n');

const generateButtons = async (voiceChannel : VoiceChannel, em : EntityManager, guildUser : GuildUser, owner : DiscordUser) => {
  const currentType = getChannelType(voiceChannel);

  const query = em.createQueryBuilder(LobbyNameChange, 'lnc')
    .where({ guildUser })
    .select(['name', 'max(date) as "date"'])
    .groupBy(['name'])
    .getKnexQuery()
    .orderBy('date', 'desc')
    .limit(25);

  const latestNameChanges = await em.getConnection().execute<LobbyNameChange[]>(query);

  const selectMenu = new MessageSelectMenu();
  selectMenu.setCustomId('name');
  selectMenu.setPlaceholder('Geen Naam Geselecteerd');
  selectMenu.addOptions(latestNameChanges.map((ltc) : MessageSelectOptionData => {
    const generatedName = generateLobbyName(currentType, owner, ltc.name);

    if (!generatedName) throw new Error('Invalid Name');

    const icon = emojiRegex().exec(generatedName)?.[0];

    return {
      emoji: icon ?? undefined,
      label: icon ? generatedName.substring(icon?.length).trim() : generatedName,
      value: ltc.name,
      default: generatedName === voiceChannel.name,
    };
  }));

  const limitRow = new MessageActionRow({
    components: [new MessageButton({
      customId: '0',
      label: 'Geen',
      style: voiceChannel.userLimit === 0 ? 'SUCCESS' : 'SECONDARY',
      disabled: voiceChannel.userLimit === 0,
    })],
  });

  for (let i = 2; i <= 5; i += 1) {
    limitRow.addComponents(new MessageButton({
      customId: `${i}`,
      label: `${i}`,
      style: voiceChannel.userLimit === i ? 'SUCCESS' : 'SECONDARY',
      disabled: voiceChannel.userLimit === i,
    }));
  }

  const highLimitButtons = new MessageActionRow({
    components: [10, 12, 15, 20, 25].map((n) => new MessageButton({
      customId: `${n}`,
      label: `${n}`,
      style: voiceChannel.userLimit === n ? 'SUCCESS' : 'SECONDARY',
      disabled: voiceChannel.userLimit === n,
    })),
  });

  const actionRows = [
    new MessageActionRow({
      components: Object.entries(ChannelType).map(([,type]) => new MessageButton({
        customId: type,
        emoji: getIcon(type),
        label: `${type[0].toUpperCase()}${type.substring(1)}`,
        style: currentType === type ? 'SUCCESS' : 'SECONDARY',
        disabled: currentType === type,
      })),
    }),
    limitRow,
    highLimitButtons,
  ];

  if (latestNameChanges.length > 0) {
    actionRows.push(new MessageActionRow({
      components: [
        selectMenu,
      ],
    }));
  }

  return actionRows;
};

interface NameChangeTimeout {
  changes : Date[],
  timeout ?: NodeJS.Timeout
}

const changeLobby = (() => {
  const timeouts = new Map<Snowflake, NameChangeTimeout>();

  return async (
    changeTo : ChannelType,
    voiceChannel : VoiceChannel,
    owner : DiscordUser,
    guild : Guild,
    tempChannel : TempChannel,
    limit: number,
    forcePermissionUpdate = false,
    interaction: MessageComponentInteraction | null,
    em: EntityManager,
  ) => {
    const deny = toDeny(changeTo);
    const currentType = getChannelType(voiceChannel);
    const textChannel = activeTempText(guild.client, tempChannel);

    if (changeTo !== currentType || forcePermissionUpdate) {
      const newOverwrites = currentType === ChannelType.Public ? voiceChannel.members
        .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
        .map((member) : OverwriteResolvable => ({ id: member.id, allow: ['SPEAK', 'CONNECT'] })) : [];

      if (currentType === ChannelType.Mute && changeTo === ChannelType.Public) {
        voiceChannel.members
          .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
          .forEach((member) => member.voice.setMute(false));
      } else if (currentType === ChannelType.Mute && changeTo === ChannelType.Nojoin) {
        voiceChannel.members
          .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
          .forEach((member) => {
            member.voice.setChannel(null);
            member.send(`Je bent verwijderd uit *${owner.username}'s*, omdat de lobby was veranderd naar ${changeTo} en jij nog geen toestemming had gekregen`);
          });
      }

      await voiceChannel.permissionOverwrites.set([
        ...voiceChannel.permissionOverwrites.cache.values(),
        { id: guild.id, deny },
        ...newOverwrites,
      ])
        .then(async (voice) => {
          const tc = await textChannel;
          if (tc && voice instanceof VoiceChannel) { return updateTextChannel(voice, tc); }
          return null;
        })
        .catch(console.error);
    }

    const newName = generateLobbyName(changeTo, owner, tempChannel.name);
    if (!newName) throw new Error('Invalid Lobby Name');

    const currentName = await voiceChannel.fetch(false).then((vc) => (vc instanceof VoiceChannel && vc.name) || null).catch(() => null);
    let timeTillNameChange : Duration | undefined;

    if (newName !== currentName) {
      if (tempChannel.name) {
        const lobbyNameChange = new LobbyNameChange();
        lobbyNameChange.name = tempChannel.name;
        lobbyNameChange.guildUser = tempChannel.guildUser;
        em.persist(lobbyNameChange);
      }

      const timeout = timeouts.get(voiceChannel.id);
      const execute = async () => {
        await Promise.all([voiceChannel.fetch(false).catch(() => null), (await textChannel)?.fetch(false).catch(() => null)])
          .then(([vc, tc]) => {
            const newVoiceName = generateLobbyName(changeTo, owner, tempChannel.name);
            const newTextName = generateLobbyName(changeTo, owner, tempChannel.name, true);

            if (!newVoiceName || !newTextName) throw new Error('Invalid Name Given');

            if (vc && vc instanceof VoiceChannel) {
              vc.setName(newVoiceName)
                .then(() => {
                  timeout?.changes.push(new Date());
                })
                .catch(() => {});

              if (tc && tc instanceof TextChannel) {
                tc.setName(newTextName)
                  .then((updatedTc) => {
                    if (tempChannel.controlDashboardId) return updatedTc.messages.fetch(`${BigInt(tempChannel.controlDashboardId)}`, { cache: true });

                    return null;
                  })
                  .then(async (msg) => msg?.edit({ content: dashBoardText, components: await generateButtons(vc, em, tempChannel.guildUser, owner) }))
                  .catch(() => { });
              }
            } else {
              timeouts.delete(voiceChannel.id);
            }
          });
      };

      if (!timeout) {
        await execute();

        timeouts.set(voiceChannel.id, {
          changes: [new Date()],
        });
      } else {
        timeout.changes = timeout.changes.filter((date) => date.getTime() > (new Date()).getTime() - 1000 * 60 * 10);

        if (timeout.changes.length < 2) {
          await execute();

          timeout.changes.push(new Date());
        } else {
          const date = timeout.changes.sort()[0];
          const timeTo = (date.getTime() + 1000 * 60 * 10) - (new Date()).getTime();
          timeTillNameChange = moment.duration(timeTo, 'milliseconds');

          if (timeout.timeout) clearTimeout(timeout.timeout);
          timeout.timeout = setTimeout(execute, timeTo);
        }
      }
    } else {
      const timeout = timeouts.get(voiceChannel.id);
      if (timeout?.timeout) clearTimeout(timeout.timeout);
    }

    if (voiceChannel.userLimit !== limit) {
      await voiceChannel.setUserLimit(limit);
    }

    const content = `${dashBoardText}${timeTillNameChange ? `\n\nDe naam van de lobby wordt ${timeTillNameChange.locale('nl').humanize(true)} veranderd naar \`${newName}\`` : ''}`;

    if (!(interaction && interaction.update({ content, components: await generateButtons(voiceChannel, em, tempChannel.guildUser, owner) }).then(() => true).catch(() => false)) && tempChannel.controlDashboardId) {
      const msg = await (await textChannel)?.messages.fetch(`${BigInt(tempChannel.controlDashboardId)}`, { cache: true }).catch(() => null);
      if (msg) msg.edit({ content, components: await generateButtons(voiceChannel, em, tempChannel.guildUser, owner) }).catch(() => {});
    }

    return timeTillNameChange;
  };
})();

const changeTypeHandler : GuildHandler = async ({
  params, msg, guildUser, em, flags,
}) => {
  const requestingUser = msg instanceof Message ? msg.author : msg.user;
  if (msg.channel instanceof DMChannel || msg.guild === null || guildUser === null) {
    return 'Dit commando kan alleen op servers worden gebruikt';
  }
  const lobbyOwner = await guildUser;
  if (lobbyOwner.tempChannel?.isInitialized()) await lobbyOwner.tempChannel.init();

  const activeChannel = await activeTempChannel(msg.client, em, lobbyOwner.tempChannel);

  if (!activeChannel || !lobbyOwner.tempChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`';
  }

  if (lobbyOwner.tempChannel.textChannelId !== msg.channel.id) return 'Dit commando kan alleen gegeven worden in het tekstkanaal van deze lobby';

  if (params.length > 1) {
    return 'Ik verwachte niet meer dan **één** argument';
  }

  const type = getChannelType(activeChannel);

  const [typeGiven] = flags.get('type') || params;

  if (!typeGiven) {
    if (type === ChannelType.Mute) return `Type van lobby is \`${ChannelType.Mute}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Nojoin}\``;
    if (type === ChannelType.Nojoin) return `Type van lobby is \`${ChannelType.Nojoin}\` andere types zijn \`${ChannelType.Public}\` en \`${ChannelType.Mute}\``;
    return `Type van lobby is \`${ChannelType.Public}\` andere types zijn \`${ChannelType.Mute}\` en \`${ChannelType.Nojoin}\``;
  }

  if (typeof typeGiven !== 'string') {
    return 'Ik verwachte hier geen **mention**';
  }

  const changeTo = <ChannelType>typeGiven;

  if (!Object.values(ChannelType).includes(changeTo)) {
    return `*${typeGiven}* is niet een lobby type`;
  }

  if (changeTo === type) {
    return `Je lobby was al een **${type}** lobby`;
  }

  changeLobby(changeTo, activeChannel, requestingUser, msg.guild, lobbyOwner.tempChannel, activeChannel.userLimit, true, null, em);

  return `Lobby type is veranderd naar *${changeTo}*`;
};

router.use('type', changeTypeHandler, HandlerType.GUILD, {
  description: 'Verander de type van de lobby',
  options: [
    {
      name: 'type',
      description: 'Type waarin je de lobby wil veranderen',
      choices: [
        {
          name: `${ChannelType.Mute[0].toUpperCase()}${ChannelType.Mute.substring(1)}`,
          value: ChannelType.Mute,
        }, {
          name: `${ChannelType.Nojoin[0].toUpperCase()}${ChannelType.Nojoin.substring(1)}`,
          value: ChannelType.Nojoin,
        }, {
          name: `${ChannelType.Public[0].toUpperCase()}${ChannelType.Public.substring(1)}`,
          value: ChannelType.Public,
        },
      ],
      type: 'STRING',
      required: true,
    },
  ],
});
router.use('change', changeTypeHandler, HandlerType.GUILD);
router.use('set', changeTypeHandler, HandlerType.GUILD);
router.use('verander', changeTypeHandler, HandlerType.GUILD);

const sizeHandler : GuildHandler = async ({
  msg, guildUser, params, em, flags,
}) => {
  const gu = await guildUser;
  const activeChannel = await activeTempChannel(msg.client, em, gu.tempChannel);
  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  if (!gu.tempChannel || !activeChannel) {
    return 'Je hebt nog geen lobby aangemaakt\nMaak één aan met `ei lobby create`';
  }

  if (gu.tempChannel.textChannelId !== msg.channel.id) return 'Dit commando kan alleen gegeven worden in het tekstkanaal van deze lobby';

  const [sizeParam] = flags.get('size') || params;

  if (typeof sizeParam !== 'string' && typeof sizeParam !== 'number') {
    return 'Geef een nummer dickhead';
  }

  let size = typeof sizeParam === 'number' ? sizeParam : Number.parseInt(sizeParam, 10);

  if (sizeParam.toString().toLowerCase() === 'none' || sizeParam.toString().toLowerCase() === 'remove') {
    size = 0;
  }

  if (!Number.isSafeInteger(size)) {
    return 'Even een normaal nummer alstublieft';
  }

  if (size > 99) { size = 99; }
  size = Math.abs(size);

  const type = getChannelType(activeChannel);

  await changeLobby(type, activeChannel, requestingUser, msg.guild, gu.tempChannel, size, false, null, em);

  if (size === 0) { return 'Limiet is verwijderd'; } return `Limiet veranderd naar ${size}${size === 1 && activeChannel.members.size === 1 ? '???\nWaarom zit je in discord als je in je eentje in een kanaal gaat zitten? Heb je niks beters te doen?' : ''}`;
};

router.use('size', sizeHandler, HandlerType.GUILD);
router.use('limit', sizeHandler, HandlerType.GUILD, {
  description: 'Limiteer de lobby grootte',
  options: [{
    name: 'size',
    description: 'Limiet die je wil instellen',
    type: 'INTEGER',
    required: true,
  }],
});
router.use('userlimit', sizeHandler, HandlerType.GUILD);

router.use('category', async ({
  params, msg, em, flags,
}) => {
  if (!msg.member?.permissions.has('ADMINISTRATOR')) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  let [createCategory] = flags.get('create-category') || [null];
  let [lobbyCategory] = flags.get('lobby-category') || [null];

  if (!createCategory) [createCategory] = params;
  if (!lobbyCategory) [,lobbyCategory] = params;

  if (typeof createCategory === 'string') createCategory = await msg.client.channels.fetch(`${BigInt(createCategory)}`, { cache: true }).catch(() => null);
  if (typeof lobbyCategory === 'string') lobbyCategory = await msg.client.channels.fetch(`${BigInt(lobbyCategory)}`, { cache: true }).catch(() => null);

  if (!(createCategory instanceof CategoryChannel)) return 'Gegeven create-category is niet een categorie';
  if (!(lobbyCategory instanceof CategoryChannel)) return 'Gegeven lobby-category is niet een categorie';

  if (createCategory.guild !== msg.guild) return 'Gegeven create-category van een andere server';
  if (lobbyCategory.guild !== msg.guild) return 'Gegeven lobby-category van een andere server';

  const createCategoryData = getCategoryData(em, createCategory);
  if ((await createCategoryData).lobbyCategory === lobbyCategory.id) {
    (await createCategoryData).lobbyCategory = undefined;
    return `'${lobbyCategory.name}' is niet meer de lobby categorie`;
  }
  (await createCategoryData).lobbyCategory = lobbyCategory.id;

  return `'${lobbyCategory.name}' is nu de lobby categorie`;
}, HandlerType.GUILD, {
  description: 'Selecteer waar de gemaakte lobbies worden neergezet',
  options: [{
    name: 'create-category',
    description: 'De category waar de create-kanalen staan',
    type: 'CHANNEL',
    required: true,
  }, {
    name: 'lobby-category',
    description: 'De category waar de lobby\'s naartoe moeten',
    type: 'CHANNEL',
    required: true,
  }],
});

router.use('create-category', async ({
  params, msg, em, flags,
}) => {
  if (!msg.client.user) throw new Error('msg.client.user not set somehow');

  let [category] = flags.get('category') || [null];

  if (!msg.member?.permissions.has('ADMINISTRATOR')) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  if (!category && typeof params[0] === 'string') category = await msg.client.channels.fetch(`${BigInt(params[0])}`, { cache: true }).catch(() => null);

  if (!(category instanceof CategoryChannel)) return 'Gegeven is geen categorie';

  if (!category.permissionsFor(msg.client.user)?.has('MANAGE_CHANNELS')) {
    return 'Ik heb niet de permission om kanalen aan te maken';
  }

  if (!category.permissionsFor(msg.client.user)?.has('MOVE_MEMBERS')) {
    return 'Ik heb niet de permission om members te verplaatsen';
  }

  const categoryData = await getCategoryData(em, category);
  if (!categoryData) return 'Dit pad is onmogelijk :D';

  if (category.guild !== msg.guild) return 'Gegeven categorie van een andere server';

  if (!categoryData.publicVoice || !categoryData.muteVoice || !categoryData.privateVoice) {
    await createCreateChannels(categoryData, msg.client);

    return `${category.name} is nu een lobby aanmaak categorie`;
  }

  return Promise.all([
    getChannel(msg.client, categoryData.publicVoice).then((channel) => channel?.delete()),
    getChannel(msg.client, categoryData.privateVoice).then((channel) => channel?.delete()),
    getChannel(msg.client, categoryData.muteVoice).then((channel) => channel?.delete()),
  ])
    .then(async () => {
      categoryData.publicVoice = undefined;
      categoryData.privateVoice = undefined;
      categoryData.muteVoice = undefined;

      if (category instanceof CategoryChannel) return `${category.name} is nu geen lobby aanmaak categorie meer`;
      return 'Categorie is nu geen lobby aanmaak categorie meer';
    })
    .catch(() => 'Er is iets fout gegaan probeer het later opnieuw');
}, HandlerType.GUILD, {
  description: 'Stel de lobby aanmaak categorie in',
  options: [{
    name: 'category',
    description: 'De categorie waar de aanmaak kanalen worden neergezet',
    type: 'CHANNEL',
    required: true,
  }],
});

router.use('bitrate', async ({
  msg, guildUser, params, flags,
}) => {
  if (msg.channel instanceof DMChannel || guildUser === null) {
    return 'Je kan dit commando alleen op servers gebruiken';
  }

  if (params.length === 0) {
    if (!(await guildUser).guild.isInitialized()) await (await guildUser).guild.init();
    return `Lobby bitrate is ${(await guildUser).guild.bitrate}`;
  }

  if (params.length > 1) {
    return 'Ik verwacht maar één argument';
  }

  if (typeof params[0] !== 'string') {
    return 'Ik verwacht een string als argument';
  }

  if (!msg.member?.permissions.has('ADMINISTRATOR')) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  const newBitrate = Number(flags.get('bitrate')?.pop() || params[0]);

  if (Number.isNaN(newBitrate)) {
    return `${params[0]} is niet een nummer`;
  }

  if (newBitrate > 128000) {
    return 'Bitrate gaat tot 128000';
  }

  if (newBitrate < 8000) {
    return 'Bitrate gaat boven 8000';
  }

  if (!(await guildUser).guild.isInitialized()) await (await guildUser).guild.init();

  // eslint-disable-next-line no-param-reassign
  (await guildUser).guild.bitrate = newBitrate;

  return `Bitrate veranderd naar ${newBitrate}`;
}, HandlerType.GUILD, {
  description: 'Stel de bitrate van de lobbies in',
  options: [
    {
      name: 'bitrate',
      description: 'Bitrate waarnaar je de lobbies wil veranderen',
      required: true,
      type: 'INTEGER',
    },
  ],
});

const nameHandler : GuildHandler = async ({
  params, guildUser, msg, em, flags,
}) => {
  const requestingUser = msg instanceof Message ? msg.author : msg.user;
  const gu = await guildUser;

  const rawNameArray = flags.get('name') || params;

  if (!(await guildUser).tempChannel?.isInitialized()) await (await guildUser).tempChannel?.init();
  const tempChannel = await activeTempChannel(msg.client, em, gu.tempChannel);

  if (!tempChannel || !gu.tempChannel) return 'Je moet een lobby hebben om dit commando te kunnen gebruiken';
  if (gu.tempChannel.textChannelId !== msg.channel.id) return 'Dit commando kan alleen gegeven worden in het tekstkanaal van deze lobby';

  if (!rawNameArray.length) return 'Geef een naam in';

  const nameArray = rawNameArray.filter((param) : param is string => typeof param === 'string');
  if (nameArray.length !== rawNameArray.length) return 'Je mag alleen tekst gebruiken in de naam';

  const name = nameArray.join(' ');

  if (name.length > 80) return 'De naam mag niet langer zijn dan 80 tekens';

  gu.tempChannel.name = name;
  const type = getChannelType(tempChannel);

  try {
    const timeTillChange = await changeLobby(type, tempChannel, requestingUser, msg.guild, gu.tempChannel, tempChannel.userLimit, false, null, em);
    const newName = generateLobbyName(type, requestingUser, gu.tempChannel.name, false);

    if (timeTillChange) {
      return `Lobbynaam wordt *${timeTillChange.locale('nl').humanize(true)}* veranderd naar \`${newName}\``;
    }

    return `Lobbynaam is veranderd naar \`${newName}\``;
  } catch {
    return 'Lobby naam kan niet alleen uit een emoji bestaan';
  }
};

router.use('name', nameHandler, HandlerType.GUILD, {
  description: 'Verander de naam van je lobby',
  options: [{
    name: 'name',
    description: 'De naam waarin je de lobby naam wil veranderen',
    type: 'STRING',
    required: true,
  }],
});
router.use('rename', nameHandler, HandlerType.GUILD);
router.use('naam', nameHandler, HandlerType.GUILD);
router.use('hernoem', nameHandler, HandlerType.GUILD);

const helpHandler = () => helpCommandText;

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Get help',
});

const createAddMessage = async (tempChannel : TempChannel, user : User, client : Client, em : EntityManager, i18n : I18n) => {
  if (!tempChannel.textChannelId) throw new Error('Text channel not defined');

  const textChannel = await client.channels.fetch(`${BigInt(tempChannel.textChannelId)}`, { cache: true });
  if (!textChannel || !(textChannel instanceof TextChannel)) throw new Error('Text channel not found');

  const activeChannel = await activeTempChannel(client, em, tempChannel);
  if (!activeChannel) throw new Error('No active temp channel');

  const actionRow = new MessageActionRow();
  actionRow.addComponents(new MessageButton({
    customId: 'add',
    label: 'Voeg toe',
    style: 'SUCCESS',
  }));

  textChannel.send({
    allowedMentions: { roles: [], users: [] },
    content: `Voeg ${user} toe aan de lobby?`,
    components: [actionRow],
  }).then((msg) => {
    const collector = msg.createMessageComponentCollector();
    collector.on('collect', async (interaction) => {
      if (interaction.user.id === tempChannel.guildUser.user.id && interaction.customId === 'add') {
        interaction.update({ content: addUsers([user], activeChannel, tempChannel.guildUser, client, i18n).text, components: [] });
        return;
      }

      const owner = await interaction.guild?.members.fetch({ cache: true, user: `${BigInt(tempChannel.guildUser.user.id)}` }).catch(() => undefined);

      let message;
      if (!owner) {
        message = 'Alleen de owner van de lobby kan iemand binnenlaten';
      } else {
        message = `Alleen ${owner.displayName} kan iemand binnenlaten`;
      }

      interaction.reply({ content: message, ephemeral: true }).catch(() => { });
    });
  });
};

const msgCollectors = new Map<Snowflake, InteractionCollector<MessageComponentInteraction>>();

const createDashBoardCollector = async (client : Client, voiceChannel : VoiceChannel, tempChannel : TempChannel, _em : EntityManager) => {
  const textChannel = await activeTempText(client, tempChannel);
  const owner = await client.users.fetch(tempChannel.guildUser.user.id, { cache: true }).catch(() => null);

  if (textChannel && owner) {
    let msg = tempChannel.controlDashboardId ? await textChannel.messages.fetch(`${BigInt(tempChannel.controlDashboardId)}`, { cache: true }).catch(() => undefined) : undefined;
    if (!msg) {
      msg = await textChannel.send({ content: dashBoardText, components: await generateButtons(voiceChannel, _em, tempChannel.guildUser, owner) }).catch((err) => { console.error(err); return undefined; });
      if (msg) tempChannel.controlDashboardId = msg.id;
    }

    if (!msg?.pinned && msg?.pinnable) await msg.pin();

    if (msg && !msgCollectors.has(msg.id)) {
      msgCollectors.set(msg.id, msg.createMessageComponentCollector().on('collect', async (interaction) => {
        const em = _em.fork();
        const currentTempChannel = await em.findOne(TempChannel, { channelId: voiceChannel.id }, { populate: { guildUser: { user: true } } });

        if (interaction.isMessageComponent() && currentTempChannel && interaction.guild) {
          if (interaction.user.id !== currentTempChannel.guildUser.user.id) {
            interaction.reply({ content: 'Alleen de lobby leider kan dit doen', ephemeral: true });
            return;
          }

          const limit = Number.parseInt(interaction.customId, 10);
          const currentType = getChannelType(voiceChannel);

          if (Number.isSafeInteger(limit)) {
            if (limit >= 0 && limit < 100 && interaction.guild) {
              await changeLobby(currentType, voiceChannel, interaction.user, interaction.guild, currentTempChannel, limit, false, interaction, em);
            }
          } else if (interaction.isSelectMenu() && interaction.customId === 'name') {
            [currentTempChannel.name] = interaction.values;
            await changeLobby(currentType, voiceChannel, interaction.user, interaction.guild, currentTempChannel, voiceChannel.userLimit, false, interaction, em);
          } else {
            const changeTo = <ChannelType>interaction.customId;

            if (Object.values(ChannelType).includes(changeTo) && changeTo !== currentType && interaction.guild) {
              await changeLobby(changeTo, voiceChannel, interaction.user, interaction.guild, currentTempChannel, voiceChannel.userLimit, false, interaction, em);
            }
          }

          await em.flush();
        }
      }));
    }
  }
};

const checkTempChannel = async (client : Client, tempChannel: TempChannel,
  em : EntityManager) => {
  const activeChannel = await activeTempChannel(client, em, tempChannel);
  const activeTextChannel = await activeTempText(client, tempChannel);

  if (!activeChannel) {
    em.remove(tempChannel);
    if (activeTextChannel?.deletable) await activeTextChannel.delete().catch(() => { });
    console.log('Lobby bestond niet meer');
  } else if (!activeChannel.members.filter((member) => !member.user.bot).size) {
    await activeChannel.delete();

    if (activeTextChannel) await activeTextChannel.delete();
    console.log('Verwijderd: Niemand in lobby');
    em.remove(tempChannel);
  } else if (!activeChannel.members.has(`${BigInt(tempChannel.guildUser.user.id)}`)) {
    const guildUsers = await Promise.all(activeChannel.members
      .map((member) => getUserGuildData(em, member.user, activeChannel.guild)));

    const newOwner = activeChannel.members
      .sort(
        (member1, member2) => (member1.joinedTimestamp || 0) - (member2.joinedTimestamp || 0),
      )
      .filter((member) => !guildUsers.find((gu) => gu.user.id === member.id)?.tempChannel)
      .filter((member) => {
        const isPublic = getChannelType(activeChannel) === ChannelType.Public;
        const isAllowedUser = activeChannel.permissionOverwrites.cache.has(member.id);
        const hasAllowedRole = activeChannel.permissionOverwrites.cache
          .some((overwrite) => overwrite.id !== activeChannel.guild.id
            && member.roles.cache.has(overwrite.id));

        return (isPublic || isAllowedUser || hasAllowedRole) && !member.user.bot;
      })
      .first() || activeChannel.members
      .sort(
        (member1, member2) => (member1.joinedTimestamp || 0) - (member2.joinedTimestamp || 0),
      )
      .filter((member) => !guildUsers.find((gu) => gu.user.id === member.id)?.tempChannel)
      .filter((member) => !member.user.bot)
      .first();

    if (newOwner) {
      const newOwnerGuildUser = guildUsers.find((gu) => gu.user.id === newOwner.id);

      if (!newOwnerGuildUser) throw new Error('Guild User Not Found In Array');

      tempChannel.guildUser = newOwnerGuildUser;

      const type = getChannelType(activeChannel);

      await activeChannel.permissionOverwrites.edit(newOwner, { SPEAK: true, CONNECT: true })
        .catch(console.error);

      if (newOwner.voice.suppress) { newOwner.voice.setMute(false).catch(() => { }); }

      await Promise.all([
        changeLobby(type, activeChannel, newOwner.user, newOwner.guild, tempChannel, activeChannel.userLimit, true, null, em),
          activeTextChannel?.send({
            allowedMentions: { users: [] },
            reply: tempChannel.controlDashboardId ? { messageReference: tempChannel.controlDashboardId } : undefined,
            content: `De lobby is overgedragen aan ${newOwner}`,
          }),
      ]).catch(console.error);

      console.log('Ownership is overgedragen');
    } else { console.log('Owner is weggegaan, maar niemand kwam in aanmerking om de nieuwe leider te worden'); }
  } else {
    const discordUser = await client.users.fetch(`${BigInt(tempChannel.guildUser.user.id)}`);
    const lobbyType = getChannelType(activeChannel);

    await createDashBoardCollector(client, activeChannel, tempChannel, em.fork());

    await changeLobby(lobbyType, activeChannel, discordUser, activeChannel.guild, tempChannel, activeChannel.userLimit, false, null, em);
  }
};

const checkVoiceCreateChannels = async (em : EntityManager, client : Client) => {
  const categories = await em.find(Category, {
    $or: [
      { publicVoice: { $ne: null } },
      { muteVoice: { $ne: null } },
      { privateVoice: { $ne: null } },
    ],
  });

  await Promise.all(categories.map((category) => createCreateChannels(category, client).catch(() => {})));
};

router.onInit = async (client, orm, _i18n) => {
  // Check elke tempChannel om de 60 minuten
  const checkTempLobbies = async () => {
    const em = orm.em.fork();

    const usersWithTemp = await em.getRepository(TempChannel).findAll({ populate: { guildUser: true } });

    const tempChecks = usersWithTemp.map((tcs) => checkTempChannel(client, tcs, em));

    await Promise.all(tempChecks).catch(console.error);
    await em.flush().catch(console.error);

    setTimeout(checkTempLobbies, 1000 * 60);
  };

  client.on('voiceStateUpdate', async (oldState, newState) => {
    // Check of iemand een temp lobby heeft verlaten
    if (oldState?.channel && oldState.channel.id !== newState?.channel?.id) {
      const em = orm.em.fork();
      const tempChannel = await em.findOne(TempChannel, {
        channelId: oldState.channel.id,
      }, { populate: { guildUser: true } });
      if (tempChannel) {
        await checkTempChannel(client, tempChannel, em);
        await em.flush();
      }
    }

    if (newState.channel && newState.channel.parent && oldState.channelId !== newState.channelId) { // Check of iemand een nieuw kanaal is gejoint
      const em = orm.em.fork();

      const categoryData = getCategoryData(em, newState.channel.parent);
      const guildUserPromise = newState.member?.user ? getUserGuildData(em, newState.member.user, newState.guild) : null;

      const user = newState.member?.user;

      const { channel } = newState;

      let createdChannel : VoiceChannel;
      let textChannel : TextChannel;

      // Check of iemand een create-lobby channel is gejoint
      if (
        channel
        && guildUserPromise
        && user
        && (
          channel.id === (await categoryData).publicVoice
          || channel.id === (await categoryData).muteVoice
          || channel.id === (await categoryData).privateVoice)) {
        if (!(await guildUserPromise)?.tempChannel?.isInitialized()) await (await guildUserPromise)?.init();
        const activeChannel = await activeTempChannel(client, em, (await guildUserPromise).tempChannel);
        const guildUser = await guildUserPromise;

        if (activeChannel) {
          newState.setChannel(activeChannel);
        } else if (channel.parent) {
          let type : ChannelType = ChannelType.Public;
          if (channel.id === (await categoryData).privateVoice) type = ChannelType.Nojoin;
          if (channel.id === (await categoryData).muteVoice) type = ChannelType.Mute;

          if (!guildUser.guild.isInitialized()) await guildUser.guild.init();

          createdChannel = await createTempChannel(newState.guild, `${BigInt((await categoryData).lobbyCategory || channel.parent.id)}`, [], user, guildUser.guild.bitrate, type);
          guildUser.tempChannel = new TempChannel(createdChannel.id, guildUser);

          newState.setChannel(createdChannel);

          textChannel = await createTextChannel(client, em, guildUser.tempChannel, user);
          guildUser.tempChannel.textChannelId = textChannel.id;

          await createDashBoardCollector(client, createdChannel, guildUser.tempChannel, em.fork());
        }
      } else if ( // Check of iemand een tempChannel is gejoint
        user
      && newState.channelId !== oldState.channelId
      ) {
        const tempChannel = await em.findOne(TempChannel, {
          channelId: channel.id,
        }, { populate: ['guildUser', 'guildUser.user', 'guildUser.guild'] });

        if (tempChannel) {
          const i18n = _i18n.cloneInstance({ lng: tempChannel.guildUser.user.language || tempChannel.guildUser.guild.language });
          const activeChannel = await activeTempChannel(client, em, tempChannel);

          if (!activeChannel?.permissionsFor(user)?.has(Permissions.FLAGS.SPEAK, true)) {
            await createAddMessage(tempChannel, user, client, em, i18n);
          }
        }
      }

      await em.flush().catch((err) => {
        if (err instanceof UniqueConstraintViolationException) {
          if (createdChannel.deletable) createdChannel.delete();
          if (textChannel.deletable) textChannel.delete();
        } else {
          throw err;
        }
      });
    }
  });

  checkTempLobbies();

  const em = orm.em.fork();
  await checkVoiceCreateChannels(em, client);
  await em.flush();
};

export default router;
