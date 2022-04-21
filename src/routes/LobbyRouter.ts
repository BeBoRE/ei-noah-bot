/* eslint-disable no-param-reassign */
import {
  User as DiscordUser,
  DMChannel,
  OverwriteData,
  PermissionsBitField,
  Guild as DiscordGuild,
  Client,
  VoiceChannel,
  DiscordAPIError,
  Role,
  GuildMember,
  OverwriteResolvable,
  TextChannel,
  CategoryChannel,
  User,
  Snowflake,
  ActionRow,
  ButtonComponent,
  Guild,
  MessageComponentInteraction,
  InteractionCollector,
  SelectMenuComponent,
  MessageOptions,
  Embed,
  AnyChannel,
  GuildPremiumTier,
  SelectMenuOption,
  ChannelType as DiscordChannelType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  MessageEditOptions,
  InteractionUpdateOptions,
  Modal,
  TextInputComponent,
  ModalActionRowComponent,
  TextInputStyle,
  Interaction,
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
import { OverwriteType } from 'discord-api-types/v9';
import { Logger } from 'winston';
import { createEntityCache } from '../EiNoah';
import LobbyNameChange from '../entity/LobbyNameChange';
import { Category } from '../entity/Category';
import TempChannel from '../entity/TempChannel';
import createMenu from '../createMenu';
import { GuildUser } from '../entity/GuildUser';
import Router, { BothHandler, GuildHandler, HandlerType } from '../router/Router';

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
  if (type === ChannelType.Mute) return [PermissionsBitField.Flags.Speak];
  if (type === ChannelType.Nojoin) return [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak];
  if (type === ChannelType.Public) return [];

  return [];
}

function toDenyText(type : ChannelType) {
  if (type === ChannelType.Mute) return [PermissionsBitField.Flags.SendMessages];
  if (type === ChannelType.Nojoin) return [PermissionsBitField.Flags.ViewChannel];
  if (type === ChannelType.Public) return [];

  return [];
}

function getChannelType(channel : VoiceChannel) {
  if (!channel.permissionOverwrites.resolve(channel.guild.id)?.deny.has(PermissionsBitField.Flags.Connect)) {
    if (!channel.permissionOverwrites.resolve(channel.guild.id)?.deny.has(PermissionsBitField.Flags.Speak)) return ChannelType.Public;
    return ChannelType.Mute;
  } return ChannelType.Nojoin;
}

function getMaxBitrate(guild : Guild) : number {
  if (guild.premiumTier === GuildPremiumTier.Tier1) return 128000;
  if (guild.premiumTier === GuildPremiumTier.Tier2) return 256000;
  if (guild.premiumTier === GuildPremiumTier.Tier3) return 384000;
  return 96000;
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
    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
  }));

  const bot = guild.client.user;
  const maxBitrate = getMaxBitrate(guild);

  if (bot !== null) {
    permissionOverwrites.push({
      id: bot.id,
      allow: [
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
        PermissionsBitField.Flags.MuteMembers,
        PermissionsBitField.Flags.MoveMembers,
        PermissionsBitField.Flags.DeafenMembers,
        PermissionsBitField.Flags.ManageChannels,
      ],
    });
  }

  permissionOverwrites.push({
    id: owner.id,
    allow: [
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
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
    type: DiscordChannelType.GuildVoice,
    permissionOverwrites,
    parent,
    bitrate: bitrate < maxBitrate ? bitrate : maxBitrate,
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
      if (err.status === 404) {
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
      if (err.status === 404) {
        tempChannel.textChannelId = undefined;
        return undefined;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return undefined;
}

function getTextPermissionOverwrites(voice : VoiceChannel, client : Client) : OverwriteData[] {
  return voice.permissionOverwrites.cache.map((overwrite) : OverwriteData => {
    // @Everyone overwrite
    if (overwrite.id === voice.guild.id) {
      return {
        id: overwrite.id,
        deny: toDenyText(getChannelType(voice)),
        type: overwrite.type,
      };
    }

    // @ei-noah / self overwrite
    if (overwrite.id === client.user?.id) {
      return {
        id: overwrite.id,
        allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ViewChannel],
        type: overwrite.type,
      };
    }

    // Individual overwrites
    return {
      allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
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
    ...getTextPermissionOverwrites(voiceChannel, client),
    {
      id: voiceChannel.guild.id,
      type: OverwriteType.Role,
      deny: PermissionsBitField.Flags.ViewChannel,
    },
  ];

  const name = generateLobbyName(getChannelType(voiceChannel), owner, tempChannel.name, true);

  if (!name) throw new Error('Invalid Name');

  return voiceChannel.guild.channels.create(
    name,
    {
      type: DiscordChannelType.GuildText,
      parent: voiceChannel.parent || undefined,
      permissionOverwrites,
    },
  );
}

function updateTextChannel(voice : VoiceChannel, text : TextChannel) {
  return text.permissionOverwrites.set(getTextPermissionOverwrites(voice, voice.client));
}

const createCreateChannel = (type : ChannelType, category : CategoryChannel) => {
  const typeName = `${type[0].toUpperCase()}${type.substring(1, type.length)}`;
  return category.guild.channels.create(`${getIcon(type)} Create ${typeName} Lobby`, {
    type: DiscordChannelType.GuildVoice,
    parent: category,
  });
};

const getChannel = (client : Client, channelId ?: string) => new Promise<null | AnyChannel>(
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
const addUsers = (toAllow : Array<DiscordUser | Role>, activeChannel : VoiceChannel, owner : GuildUser, client : Client, i18n : I18n, logger : Logger) : AddUsersResponse => {
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
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.ViewChannel,
    ],
  }))];

  activeChannel.permissionOverwrites.set(newOverwrites)
    .then(async (newChannel) => {
      if (owner.tempChannel) {
        const textChannel = await activeTempText(client, owner.tempChannel);
        if (textChannel && newChannel instanceof VoiceChannel) { updateTextChannel(newChannel, textChannel); }
      }
    })
    .catch(() => logger.error('Overwrite permission error'));

  const allowedUsersMessage = i18n.t('lobby.userAdded', { users: allowedUsers.map((u) => u.toString()), count: allowedUsers.length });

  let alreadyInMessage : string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else alreadyInMessage = i18n.t('lobby.userAlreadyAdded', { users: alreadyAllowedUsers.map((u) => u.toString()), count: alreadyAllowedUsers.length });

  return {
    allowedUsersOrRoles: allowedUsers,
    alreadyAllowed: alreadyAllowedUsers,
    alreadyAllowedMessage: allowedUsersMessage,
    alreadyInMessage,
    text: `${allowedUsersMessage}\n${alreadyInMessage}`,
  };
};

router.use('add', async ({
  params, msg, guildUser, em, flags, i18n, logger,
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

  return addUsers(userOrRole, activeChannel, guildUser, msg.client, i18n, logger).text;
}, HandlerType.GUILD, {
  description: 'Add a user or role to the lobby',
  options: [{
    name: 'mention',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
    required: true,
  }, {
    name: '1',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '2',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '3',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '4',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '5',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '6',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '7',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '8',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '9',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '10',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '11',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '12',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '13',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '14',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }, {
    name: '15',
    description: 'User or role you want to add',
    type: ApplicationCommandOptionType.Mentionable,
  }],
});

router.useContext('Add To Lobby', ApplicationCommandType.User, async ({
  interaction, guildUser, em, i18n, logger,
}) => {
  if (!guildUser) return i18n.t('error.onlyUsableOnGuild');

  const activeChannel = guildUser.tempChannel && await activeTempChannel(interaction.client, em, guildUser.tempChannel);
  if (!guildUser.tempChannel || !activeChannel) return i18n.t('lobby.error.noLobby');

  const userToAdd = interaction.options.getUser('user', true);

  const addResponse = addUsers([userToAdd], activeChannel, guildUser, interaction.client, i18n, logger);

  if (interaction.channel?.id !== guildUser.tempChannel.textChannelId) {
    const textChannel = await activeTempText(interaction.client, guildUser.tempChannel);

    if (addResponse.allowedUsersOrRoles.length && interaction.channel?.id !== textChannel?.id && interaction.client.user && textChannel?.permissionsFor(interaction.client.user)?.has(PermissionsBitField.Flags.SendMessages)) {
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
          deletePromises.push(channel.permissionOverwrites.edit(member.id, { Connect: true, Speak: true }));
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
        message += i18n.t('lobby.rolePluralRemovalUserPluralNotRemoved', { users: usersGivenPermissions.map((i) => i.toString()) });
      } else {
        message += i18n.t('lobby.roleRemovalUserPluralNotRemoved', { users: usersGivenPermissions.map((i) => i.toString()) });
      }
    } else if (rolesRemoved.length > 1) {
      message += i18n.t('lobby.rolePluralRemovalUserNotRemoved', { users: usersGivenPermissions.map((i) => i.toString()) });
    } else {
      message += i18n.t('lobby.roleRemovalUserNotRemoved', { users: usersGivenPermissions.map((i) => i.toString()) });
    }
    message += i18n.t('lobby.removeThemWith', { users: usersGivenPermissions.map((member) => `@${member.user.tag}`).join(' ') });
  }

  if (notRemoved.length) {
    if (triedRemoveSelf) message += i18n.t('lobby.cantRemoveSelf');
    if (triedRemoveEi) message += i18n.t('lobby.cantRemoveEi');
    message += i18n.t('lobby.couldntBeRemoved', { users: notRemoved.map((i) => i.toString()), count: notRemoved.length });
  }

  if (removedList.length) {
    message += i18n.t('lobby.usersRemoved', { users: removedList.map((i) => i.toString()), count: removedList.length });
  }

  if (rolesRemoved.length) {
    message += i18n.t('lobby.rolesRemoved', { roles: rolesRemoved.map((i) => i.toString()), count: rolesRemoved.length });
  }

  if (rolesNotRemoved.length) {
    message += i18n.t('lobby.rolesNotRemoved', { roles: rolesNotRemoved.map((i) => i.toString()), count: rolesNotRemoved.length });
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
  params, msg, guildUser, em, flags, i18n, logger,
}) => {
  const nonUsersOrRoles = params
    .filter((param) => !(param instanceof DiscordUser || param instanceof Role));
  const users = params.filter((param): param is DiscordUser => param instanceof DiscordUser);
  const roles = params.filter((param): param is Role => param instanceof Role);
  const requestingUser = msg.user;

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
      logger,
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
        [new ButtonComponent({
          label: '❌',
          customId: 'delete',
          style: ButtonStyle.Danger,
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
      type: ApplicationCommandOptionType.Mentionable,
      description: 'Person or role to remove',
    }, {
      name: '1',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '2',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '3',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '4',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '5',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '6',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '7',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '8',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '9',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '10',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '11',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '12',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '13',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '14',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    }, {
      name: '15',
      description: 'Person or role to remove',
      type: ApplicationCommandOptionType.Mentionable,
    },
  ],
});

const generateComponents = async (voiceChannel : VoiceChannel, em : EntityManager, guildUser : GuildUser, owner : DiscordUser, i18n : I18n) => {
  const currentType = getChannelType(voiceChannel);

  const query = em.createQueryBuilder(LobbyNameChange, 'lnc')
    .where({ guildUser })
    .select(['name', 'max(date) as "date"'])
    .groupBy(['name'])
    .getKnexQuery()
    .orderBy('date', 'desc')
    .limit(25);

  const latestNameChanges = await em.getConnection().execute<LobbyNameChange[]>(query);

  const selectMenu = new SelectMenuComponent();
  selectMenu.setCustomId('name');
  selectMenu.setPlaceholder(i18n.t('lobby.noNameSelected'));
  selectMenu.addOptions(...latestNameChanges.map((ltc) : SelectMenuOption => {
    const generatedName = generateLobbyName(currentType, owner, ltc.name);

    if (!generatedName) throw new Error('Invalid Name');

    const icon = emojiRegex().exec(generatedName)?.[0];
    const option = new SelectMenuOption();
    if (icon) option.setEmoji({ name: icon });
    option.setLabel(icon ? generatedName.substring(icon?.length).trim() : generatedName);
    option.setValue(ltc.name);
    option.setDefault(generatedName === voiceChannel.name);

    return option;
  }));

  const limitRow = new ActionRow();

  limitRow.addComponents(new ButtonComponent({
    customId: '0',
    label: i18n.t('lobby.none') || 'none',
    style: voiceChannel.userLimit === 0 ? ButtonStyle.Success : ButtonStyle.Secondary,
    disabled: voiceChannel.userLimit === 0,
  }));

  for (let i = 2; i <= 5; i += 1) {
    limitRow.addComponents(new ButtonComponent({
      customId: `${i}`,
      label: `${i}`,
      style: voiceChannel.userLimit === i ? ButtonStyle.Success : ButtonStyle.Secondary,
      disabled: voiceChannel.userLimit === i,
    }));
  }

  const highLimitButtons = new ActionRow();
  highLimitButtons.addComponents(...[10, 12, 15, 20, 25].map((n) => new ButtonComponent({
    customId: `${n}`,
    label: `${n}`,
    style: voiceChannel.userLimit === n ? ButtonStyle.Success : ButtonStyle.Secondary,
    disabled: voiceChannel.userLimit === n,
  })));

  const channelTypeButtons = new ActionRow();
  channelTypeButtons.addComponents(...Object.entries(ChannelType).map(([,type]) => new ButtonComponent({
    customId: type,
    emoji: { name: getIcon(type) },
    label: `${type[0].toUpperCase()}${type.substring(1)}`,
    style: currentType === type ? ButtonStyle.Success : ButtonStyle.Secondary,
    disabled: currentType === type,
  })));

  const actionRows = [
    channelTypeButtons,
    limitRow,
    highLimitButtons,
  ];

  const selectMenuRow = new ActionRow();
  selectMenuRow.addComponents(selectMenu);

  if (latestNameChanges.length > 0) {
    actionRows.push(selectMenuRow);
  }

  const renameButtonRow = new ActionRow();
  renameButtonRow.addComponents(new ButtonComponent({
    style: ButtonStyle.Secondary,
    customId: 'open-rename-modal',
    label: i18n.t('lobby.renameButton'),
    emoji: { name: '✏' },
  }));

  actionRows.push(renameButtonRow);

  return actionRows;
};

const getDashboardOptions = (i18n : I18n, guild : Guild, leader : User, timeTill ?: Duration, newName ?: string) : MessageOptions => {
  const text = `${i18n.t('lobby.dashboardText', { joinArrays: '\n' })}`;
  const embed = new Embed();

  const avatarURL = leader.displayAvatarURL({ size: 64, extension: 'webp' });
  const color : number | undefined = guild.me?.displayColor || 0xffcc5f;

  embed.setAuthor({
    name: i18n.t('lobby.leader', { user: leader.username }),
    iconURL: avatarURL,
  });

  embed.setDescription(text);

  if (timeTill && newName) {
    embed.setFooter({
      text: i18n.t('lobby.nameOfLobbyChangeDuration', { duration: timeTill.locale(i18n.language).humanize(true), name: newName }),
    });
  }

  if (color) embed.setColor(color);

  return { embeds: [embed], content: null };
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
    i18n : I18n,
    logger : Logger,
  ) => {
    const deny = toDeny(changeTo);
    const currentType = getChannelType(voiceChannel);
    const textChannel = activeTempText(guild.client, tempChannel);

    if (changeTo !== currentType || forcePermissionUpdate) {
      const newOverwrites = currentType === ChannelType.Public ? voiceChannel.members
        .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
        .map((member) : OverwriteResolvable => ({ id: member.id, allow: [PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Connect] })) : [];

      if (currentType === ChannelType.Mute && changeTo === ChannelType.Public) {
        voiceChannel.members
          .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
          .forEach((member) => member.voice.setMute(false));
      } else if (currentType === ChannelType.Mute && changeTo === ChannelType.Nojoin) {
        voiceChannel.members
          .filter((member) => !voiceChannel.permissionOverwrites.cache.has(member.id))
          .forEach((member) => {
            member.voice.setChannel(null).catch(() => {});
            member.send(i18n.t('lobby.typeChangeRemoval', { owner: owner.toString(), type: changeTo })).catch(() => {});
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
        .catch((error) => logger.error(error.description, { error }));
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
                  .then(async (msg) => msg?.edit({ ...<MessageEditOptions[]>getDashboardOptions(i18n, guild, owner), components: await generateComponents(vc, em, tempChannel.guildUser, owner, i18n) }))
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
          const date = timeout.changes.sort((a, b) => a.getTime() - b.getTime())[0];
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

    const content = getDashboardOptions(i18n, guild, owner, timeTillNameChange, newName);

    if (!(interaction && await interaction.update({ ...<InteractionUpdateOptions>content, components: await generateComponents(voiceChannel, em, tempChannel.guildUser, owner, i18n) }).then(() => true).catch(() => false)) && tempChannel.controlDashboardId) {
      const msg = await (await textChannel)?.messages.fetch(`${BigInt(tempChannel.controlDashboardId)}`, { cache: true }).catch(() => null);
      if (msg) msg.edit({ ...<MessageEditOptions>content, components: await generateComponents(voiceChannel, em, tempChannel.guildUser, owner, i18n) }).catch(() => {});
    }

    return timeTillNameChange;
  };
})();

const changeTypeHandler : GuildHandler = async ({
  params, msg, guildUser, em, flags, i18n, logger,
}) => {
  const requestingUser = msg.user;
  if (msg.channel instanceof DMChannel || msg.guild === null || guildUser === null) {
    return i18n.t('error.onlyUsableOnGuild');
  }
  const lobbyOwner = await guildUser;
  if (lobbyOwner.tempChannel?.isInitialized()) await lobbyOwner.tempChannel.init();

  const activeChannel = await activeTempChannel(msg.client, em, lobbyOwner.tempChannel);

  if (!activeChannel || !lobbyOwner.tempChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (lobbyOwner.tempChannel.textChannelId !== msg.channel.id) return i18n.t('lobby.error.useTextChannel', { channel: lobbyOwner.tempChannel.textChannelId });

  if (params.length > 1) {
    return i18n.t('lobby.error.onlyOneArgumentExpected');
  }

  const type = getChannelType(activeChannel);

  const [typeGiven] = flags.get('type') || params;

  const otherTypes = Object
    .values(ChannelType).filter((t) => t !== type)
    .map((t) => `\`${t}\``);

  if (!typeGiven) {
    return i18n.t('lobby.typeOfLobbyOtherTypes', {
      currentType: type,
      otherTypes,
      count: otherTypes.length,
    });
  }

  if (typeof typeGiven !== 'string') {
    return i18n.t('noMentionExpected');
  }

  const changeTo = <ChannelType>typeGiven;

  if (!Object.values(ChannelType).includes(changeTo)) {
    return i18n.t('lobby.error.notALobbyType', { type: changeTo });
  }

  if (changeTo === type) {
    return i18n.t('lobby.error.lobbyAlreadyType', { type: changeTo });
  }

  changeLobby(changeTo, activeChannel, requestingUser, msg.guild, lobbyOwner.tempChannel, activeChannel.userLimit, true, null, em, i18n, logger);

  return i18n.t('lobby.lobbyTypeChangedTo', { type: changeTo });
};

router.use('type', changeTypeHandler, HandlerType.GUILD, {
  description: 'Change the type of the lobby',
  options: [
    {
      name: 'type',
      description: 'Type you want to change your lobby to',
      choices:
        Object.values(ChannelType).map((t) => ({
          name: `${getIcon(t)} ${t[0].toUpperCase()}${t.substring(1)}`,
          value: t,
        })),
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
});
router.use('change', changeTypeHandler, HandlerType.GUILD);
router.use('set', changeTypeHandler, HandlerType.GUILD);
router.use('verander', changeTypeHandler, HandlerType.GUILD);

const sizeHandler : GuildHandler = async ({
  msg, guildUser, params, em, flags, i18n, logger,
}) => {
  const activeChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);
  const requestingUser = msg.user;

  if (!guildUser.tempChannel || !activeChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (guildUser.tempChannel.textChannelId !== msg.channel.id) return i18n.t('lobby.error.useTextChannel', { channel: guildUser.tempChannel.textChannelId });

  const [sizeParam] = flags.get('size') || params;

  if (typeof sizeParam !== 'string' && typeof sizeParam !== 'number') {
    return i18n.t('lobby.error.numberExpected');
  }

  let size = typeof sizeParam === 'number' ? sizeParam : Number.parseInt(sizeParam, 10);

  if (sizeParam.toString().toLowerCase() === 'none' || sizeParam.toString().toLowerCase() === 'remove') {
    size = 0;
  }

  if (!Number.isSafeInteger(size)) {
    return i18n.t('lobby.error.notSaveInt');
  }

  if (size > 99) { size = 99; }
  size = Math.abs(size);

  const type = getChannelType(activeChannel);

  await changeLobby(type, activeChannel, requestingUser, msg.guild, guildUser.tempChannel, size, false, null, em, i18n, logger);

  if (size === 0) return i18n.t('lobby.limitRemoved');

  return i18n.t('lobby.limitChanged', { changedTo: size });
};

router.use('size', sizeHandler, HandlerType.GUILD);
router.use('limit', sizeHandler, HandlerType.GUILD, {
  description: 'Limit your lobby size',
  options: [{
    name: 'size',
    description: 'Limit you want to set',
    type: ApplicationCommandOptionType.Integer,
    required: true,
  }],
});
router.use('userlimit', sizeHandler, HandlerType.GUILD);

router.use('lobby-category', async ({
  params, msg, flags, i18n, getCategory,
}) => {
  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  let [createCategory] = flags.get('create-category') || [null];
  let [lobbyCategory] = flags.get('lobby-category') || [null];

  if (!createCategory) [createCategory] = params;
  if (!lobbyCategory) [,lobbyCategory] = params;

  if (typeof createCategory === 'string') createCategory = await msg.client.channels.fetch(`${BigInt(createCategory)}`, { cache: true }).catch(() => null);
  if (typeof lobbyCategory === 'string') lobbyCategory = await msg.client.channels.fetch(`${BigInt(lobbyCategory)}`, { cache: true }).catch(() => null);

  if (!(createCategory instanceof CategoryChannel)) return i18n.t('lobby.error.createNotACategory');
  if (!(lobbyCategory instanceof CategoryChannel)) return i18n.t('lobby.error.lobbyNotACategory');

  if (createCategory.guild !== msg.guild) return i18n.t('lobby.error.createNotInGuild');
  if (lobbyCategory.guild !== msg.guild) return i18n.t('lobby.error.lobbyNotInGuild');

  const createCategoryData = getCategory(createCategory);
  if ((await createCategoryData).lobbyCategory === lobbyCategory.id) {
    (await createCategoryData).lobbyCategory = undefined;
    return i18n.t('lobby.removedLobbyCategory', { category: lobbyCategory.name });
  }
  (await createCategoryData).lobbyCategory = lobbyCategory.id;

  return i18n.t('lobby.nowLobbyCategory', { category: lobbyCategory.name });
}, HandlerType.GUILD, {
  description: 'Select where the lobbies are placed',
  options: [{
    name: 'create-category',
    description: 'Category where the create-channels are placed',
    type: ApplicationCommandOptionType.Channel,
    required: true,
  }, {
    name: 'lobby-category',
    description: 'The category the created lobbies should be placed',
    type: ApplicationCommandOptionType.Channel,
    required: true,
  }],
});

router.use('create-category', async ({
  params, msg, flags, i18n, getCategory,
}) => {
  if (!msg.client.user) throw new Error('msg.client.user not set somehow');

  let [category] = flags.get('category') || [null];

  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.noAdmin');
  }

  if (!category && typeof params[0] === 'string') category = await msg.client.channels.fetch(`${BigInt(params[0])}`, { cache: true }).catch(() => null);

  if (!(category instanceof CategoryChannel)) return i18n.t('lobby.error.notCategory');
  if (category.guild !== msg.guild) return i18n.t('lobby.error.categoryNotInGuild');

  if (!category.permissionsFor(msg.client.user)?.has(PermissionsBitField.Flags.ManageChannels)) {
    return i18n.t('lobby.error.noChannelCreatePermission');
  }

  if (!category.permissionsFor(msg.client.user)?.has(PermissionsBitField.Flags.MoveMembers)) {
    return i18n.t('lobby.error.noMovePermission');
  }

  const categoryData = await getCategory(category);

  if (!categoryData.publicVoice || !categoryData.muteVoice || !categoryData.privateVoice) {
    await createCreateChannels(categoryData, msg.client);

    return i18n.t('lobby.nowLobbyCreateCategory', { category: category.name });
  }

  return Promise.all([
    getChannel(msg.client, categoryData.publicVoice).then<AnyChannel | undefined>((channel) => channel?.delete()),
    getChannel(msg.client, categoryData.privateVoice).then<AnyChannel | undefined>((channel) => channel?.delete()),
    getChannel(msg.client, categoryData.muteVoice).then<AnyChannel | undefined>((channel) => channel?.delete()),
  ])
    .then(async () => {
      categoryData.publicVoice = undefined;
      categoryData.privateVoice = undefined;
      categoryData.muteVoice = undefined;

      if (category instanceof CategoryChannel) i18n.t('lobby.removedCreateCategory', { category: category.name });
      return i18n.t('lobby.removedCreateCategoryNoCategory');
    })
    .catch(() => i18n.t('lobby.error.somethingWentWrong'));
}, HandlerType.GUILD, {
  description: 'Add or remove a lobby-create category',
  options: [{
    name: 'category',
    description: 'The category where the create-channels are placed in',
    type: ApplicationCommandOptionType.Channel,
    required: true,
  }],
});

router.use('bitrate', async ({
  msg, guildUser, params, flags, i18n,
}) => {
  const [bitrate] = flags.get('bitrate') || params;

  if (!bitrate) {
    if (!guildUser.guild.isInitialized()) await guildUser.guild.init();
    return i18n.t('lobby.lobbyBitrateIs', { bitrate: guildUser.guild.bitrate });
  }

  if (params.length > 1) {
    return i18n.t('lobby.error.onlyOneArgumentExpected');
  }

  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  const givenBitrate = Number(bitrate);

  if (!Number.isSafeInteger(givenBitrate)) {
    return i18n.t('lobby.error.notANumber');
  }

  if (givenBitrate < 8000) {
    return i18n.t('lobby.error.minBitrateRange');
  }

  const maxBitrate = getMaxBitrate(msg.guild);

  const newBitrate = givenBitrate < maxBitrate ? givenBitrate : maxBitrate;

  if (!guildUser.guild.isInitialized()) await guildUser.guild.init();

  // eslint-disable-next-line no-param-reassign
  guildUser.guild.bitrate = givenBitrate;

  return i18n.t('lobby.bitrateChanged', { bitrate: newBitrate });
}, HandlerType.GUILD, {
  description: 'Set the bitrate for created lobbies',
  options: [
    {
      name: 'bitrate',
      description: 'Bitrate for created lobbies',
      required: true,
      type: ApplicationCommandOptionType.Integer,
    },
  ],
});

const nameHandler : GuildHandler = async ({
  params, guildUser, msg, em, flags, i18n, logger,
}) => {
  const requestingUser = msg.user;

  const rawNameArray = flags.get('name') || params;

  if (!guildUser.tempChannel?.isInitialized()) await guildUser.tempChannel?.init();
  const tempChannel = await activeTempChannel(msg.client, em, guildUser.tempChannel);

  if (!tempChannel || !guildUser.tempChannel) return i18n.t('lobby.error.noLobby');
  if (guildUser.tempChannel.textChannelId !== msg.channel.id) return i18n.t('lobby.error.useTextChannel', { channel: guildUser.tempChannel.textChannelId });

  if (!rawNameArray.length) return i18n.t('lobby.error.noNameGiven');

  const nameArray = rawNameArray.filter((param) : param is string => typeof param === 'string');
  if (nameArray.length !== rawNameArray.length) return i18n.t('lobby.error.onlyUseText');

  const name = nameArray.join(' ');

  if (name.length > 80) return i18n.t('lobby.error.nameLimit');

  guildUser.tempChannel.name = name;
  const type = getChannelType(tempChannel);

  try {
    const timeTillChange = await changeLobby(type, tempChannel, requestingUser, msg.guild, guildUser.tempChannel, tempChannel.userLimit, false, null, em, i18n, logger);
    const newName = generateLobbyName(type, requestingUser, guildUser.tempChannel.name, false);

    if (timeTillChange) {
      return i18n.t('lobby.lobbyNameChangeTimeLimit', {
        duration: timeTillChange.locale(i18n.language).humanize(true),
        name: newName,
      });
    }

    return i18n.t('lobby.lobbyNameChanged', { name: newName });
  } catch {
    return i18n.t('lobby.error.noEmojiOnly');
  }
};

router.use('name', nameHandler, HandlerType.GUILD, {
  description: 'Change the name of your lobby',
  options: [{
    name: 'name',
    description: 'New name of your lobby',
    type: ApplicationCommandOptionType.String,
    required: true,
  }],
});
router.use('rename', nameHandler, HandlerType.GUILD);
router.use('naam', nameHandler, HandlerType.GUILD);
router.use('hernoem', nameHandler, HandlerType.GUILD);

const helpHandler : BothHandler = ({ i18n }) => i18n.t('lobby.helpText', { joinArrays: '\n' });

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Get help',
});

const createAddMessage = async (tempChannel : TempChannel, user : User, client : Client, em : EntityManager, i18n : I18n, logger : Logger) => {
  if (!tempChannel.textChannelId) throw new Error('Text channel not defined');

  const textChannel = await client.channels.fetch(`${BigInt(tempChannel.textChannelId)}`, { cache: true });
  if (!textChannel || !(textChannel instanceof TextChannel)) throw new Error('Text channel not found');

  const activeChannel = await activeTempChannel(client, em, tempChannel);
  if (!activeChannel) throw new Error('No active temp channel');

  const actionRow = new ActionRow();
  actionRow.addComponents(new ButtonComponent({
    customId: 'add',
    label: i18n.t('lobby.addUserButton') || 'Add User',
    style: ButtonStyle.Success,
  }));

  textChannel.send({
    allowedMentions: { roles: [], users: [] },
    content: i18n.t('lobby.addUserMessage', { user: user.toString() }),
    components: [actionRow],
  }).then((msg) => {
    const collector = msg.createMessageComponentCollector();
    collector.on('collect', async (interaction) => {
      if (interaction.user.id === tempChannel.guildUser.user.id && interaction.customId === 'add') {
        interaction.update({ content: addUsers([user], activeChannel, tempChannel.guildUser, client, i18n, logger).text, components: [] });
        return;
      }

      const owner = await interaction.guild?.members.fetch({ cache: true, user: `${BigInt(tempChannel.guildUser.user.id)}` }).catch(() => undefined);

      let message;
      if (!owner) {
        message = i18n.t('lobby.error.onlyOwnerCanAllow');
      } else {
        message = i18n.t('lobby.error.onlyOwnerCanAllowUser', { user: owner.toString() });
      }

      interaction.reply({ content: message, ephemeral: true }).catch(() => { });
    });
  });
};

const msgCollectors = new Map<Snowflake, InteractionCollector<Interaction>>();

const createDashBoardCollector = async (client : Client, voiceChannel : VoiceChannel, tempChannel : TempChannel, _em : EntityManager, _i18n : I18n, logger : Logger) => {
  const textChannel = await activeTempText(client, tempChannel);
  const owner = await client.users.fetch(tempChannel.guildUser.user.id, { cache: true }).catch(() => null);
  const i18 = _i18n.cloneInstance({ lng: tempChannel.guildUser.user.language || tempChannel.guildUser.guild.language });

  if (textChannel && owner) {
    let msg = tempChannel.controlDashboardId ? await textChannel.messages.fetch(`${BigInt(tempChannel.controlDashboardId)}`, { cache: true }).catch(() => undefined) : undefined;
    if (!msg) {
      msg = await textChannel.send({ ...getDashboardOptions(i18, textChannel.guild, owner), components: await generateComponents(voiceChannel, _em, tempChannel.guildUser, owner, i18) }).catch((err) => { logger.error(err.description, { error: err }); return undefined; });
      if (msg) tempChannel.controlDashboardId = msg.id;
    }

    // TODO: Fix dat dit weer werkt
    // if (!msg?.pinned && msg?.pinnable && client.user && textChannel.permissionsFor(client.user, true)?.has(PermissionsBitField.Flags.ManageMessages)) await msg.pin();

    if (msg && !msgCollectors.has(msg.id)) {
      const collector = new InteractionCollector(client, { message: msg });
      collector.on('collect', async (interaction) => {
        const em = _em.fork();
        const currentTempChannel = await em.findOne(TempChannel, { channelId: voiceChannel.id }, { populate: { guildUser: { user: true, guild: true } } });

        if ((interaction.isMessageComponent() || interaction.isModalSubmit()) && currentTempChannel && interaction.guild) {
          const i18n = _i18n.cloneInstance({ lng: currentTempChannel.guildUser.user.language || currentTempChannel.guildUser.guild.language });
          if (interaction.user.id !== currentTempChannel.guildUser.user.id) {
            interaction.reply({ content: i18n.t('lobby.error.onlyOwner'), ephemeral: true });
            return;
          }

          const limit = Number.parseInt(interaction.customId, 10);
          const currentType = getChannelType(voiceChannel);

          if (interaction.isModalSubmit()) {
            const newName = interaction.fields.getTextInputValue('name');

            try {
              const voiceName = generateLobbyName(currentType, interaction.user, newName, false);
              currentTempChannel.name = newName;

              const duration = await changeLobby(currentType, voiceChannel, interaction.user, interaction.guild, currentTempChannel, voiceChannel.userLimit, false, null, em, i18n, logger);

              interaction.reply({
                ephemeral: true,
                content: duration ? i18n.t('lobby.lobbyNameChangeTimeLimit', {
                  duration: duration.humanize(true),
                  name: voiceName,
                }) : i18n.t('lobby.lobbyNameChanged', { name: voiceName }),
              }).catch((err) => logger.error(err.description, { error: err }));
            } catch (err) {
              interaction.reply({ content: i18n.t('lobby.error.noEmojiOnly'), ephemeral: true });
            }
          } else if (Number.isSafeInteger(limit)) {
            if (limit >= 0 && limit < 100 && interaction.guild) {
              await changeLobby(currentType, voiceChannel, interaction.user, interaction.guild, currentTempChannel, limit, false, interaction, em, i18n, logger);
            }
          } else if (interaction.isSelectMenu() && interaction.customId === 'name') {
            [currentTempChannel.name] = interaction.values;
            await changeLobby(currentType, voiceChannel, interaction.user, interaction.guild, currentTempChannel, voiceChannel.userLimit, false, interaction, em, i18n, logger);
          } else if (interaction.customId === 'open-rename-modal') {
            const modal = new Modal();
            modal.setCustomId('rename-modal');
            modal.setTitle(i18n.t('lobby.renameModal.title'));

            const row = new ActionRow<ModalActionRowComponent>();
            row.addComponents(new TextInputComponent({
              customId: 'name',
              style: TextInputStyle.Short,
              label: i18n.t('lobby.renameModal.nameLabel'),
              maxLength: 80,
            }));

            modal.setComponents(row);

            interaction.showModal(modal);
          } else {
            const changeTo = <ChannelType>interaction.customId;

            if (Object.values(ChannelType).includes(changeTo) && changeTo !== currentType && interaction.guild) {
              await changeLobby(changeTo, voiceChannel, interaction.user, interaction.guild, currentTempChannel, voiceChannel.userLimit, false, interaction, em, i18n, logger);
            }
          }

          await em.flush();
        }
      });

      msgCollectors.set(msg.id, collector);
    }
  }
};

const checkTempChannel = async (client : Client, tempChannel: TempChannel, em : EntityManager, _i18n : I18n, logger : Logger) => {
  const { getGuildUser } = createEntityCache(em);

  const activeChannel = await activeTempChannel(client, em, tempChannel);
  const activeTextChannel = await activeTempText(client, tempChannel);

  if (!activeChannel) {
    em.remove(tempChannel);
    if (activeTextChannel?.deletable) await activeTextChannel.delete().catch(() => { });
  } else if (!activeChannel.members.filter((member) => !member.user.bot).size) {
    await activeChannel.delete();

    if (activeTextChannel) await activeTextChannel.delete();
    em.remove(tempChannel);
  } else if (!activeChannel.members.has(`${BigInt(tempChannel.guildUser.user.id)}`)) {
    const guildUsers = await Promise.all(activeChannel.members
      .map((member) => getGuildUser(member.user, activeChannel.guild)));

    // Alleen users die toegestaan zijn in de lobby kunnen de lobby krijgen
    // Als er niemand in de lobby zit die toegang heeft, dan krijgt iemand de lobby die geen toegang heeft
    // Anders krijgt niemand hem
    const newOwner = activeChannel.members
      .filter((member) => !guildUsers.find((gu) => gu.user.id === member.id)?.tempChannel)
      .filter((member) => {
        const isPublic = getChannelType(activeChannel) === ChannelType.Public;
        const isAllowedUser = activeChannel.permissionOverwrites.cache.has(member.id);
        const hasAllowedRole = activeChannel.permissionOverwrites.cache
          .some((overwrite) => overwrite.id !== activeChannel.guild.id
            && member.roles.cache.has(overwrite.id));

        return (isPublic || isAllowedUser || hasAllowedRole) && !member.user.bot;
      })
      .sort(
        (member1, member2) => member1.roles.highest.position - member2.roles.highest.position,
      )
      .reverse()
      .first() || activeChannel.members
      .filter((member) => !guildUsers.find((gu) => gu.user.id === member.id)?.tempChannel)
      .filter((member) => !member.user.bot)
      .sort(
        (member1, member2) => member1.roles.highest.position - member2.roles.highest.position,
      )
      .reverse()
      .first();

    if (newOwner) {
      const newOwnerGuildUser = guildUsers.find((gu) => gu.user.id === newOwner.id);

      if (!newOwnerGuildUser) throw new Error('Guild User Not Found In Array');

      tempChannel.guildUser = newOwnerGuildUser;
      const i18n = _i18n.cloneInstance({ lng: newOwnerGuildUser.user.language || newOwnerGuildUser.guild.language });

      const type = getChannelType(activeChannel);

      await activeChannel.permissionOverwrites.edit(newOwner, { Speak: true, Connect: true })
        .catch((err) => logger.error(err.message, { error: err }));

      if (newOwner.voice.suppress) { newOwner.voice.setMute(false).catch(() => { }); }

      await Promise.all([
        changeLobby(type, activeChannel, newOwner.user, newOwner.guild, tempChannel, activeChannel.userLimit, true, null, em, i18n, logger),
          activeTextChannel?.send({
            allowedMentions: { users: [] },
            reply: tempChannel.controlDashboardId ? { messageReference: tempChannel.controlDashboardId } : undefined,
            content: i18n.t('lobby.ownershipTransferred', { user: newOwner.user.toString() }),
          }),
      ]).catch((err) => logger.error(err.message, { error: err }));
    }
  } else {
    const discordUser = await client.users.fetch(`${BigInt(tempChannel.guildUser.user.id)}`);
    const lobbyType = getChannelType(activeChannel);

    if (!tempChannel.guildUser.user.isInitialized() || !tempChannel.guildUser.guild.isInitialized()) throw new Error('user of guild is not initialized');

    const i18n = _i18n.cloneInstance({ lng: tempChannel.guildUser.user.language || tempChannel.guildUser.guild.language });

    await createDashBoardCollector(client, activeChannel, tempChannel, em.fork(), i18n, logger);

    await changeLobby(lobbyType, activeChannel, discordUser, activeChannel.guild, tempChannel, activeChannel.userLimit, false, null, em, i18n, logger);
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

router.onInit = async (client, orm, _i18n, logger) => {
  // Check elke tempChannel om de 60 minuten
  const checkTempLobbies = async () => {
    const em = orm.em.fork();

    const usersWithTemp = await em.getRepository(TempChannel).findAll({
      populate: {
        guildUser: {
          user: true,
          guild: true,
        },
      },
    });

    const tempChecks = usersWithTemp.map((tcs) => checkTempChannel(client, tcs, em, _i18n, logger));

    await Promise.all(tempChecks).catch((err) => logger.error(err.description, { error: err }));
    await em.flush().catch((error) => logger.error(error.description, { error }));

    setTimeout(checkTempLobbies, 1000 * 60);
  };

  client.on('voiceStateUpdate', async (oldState, newState) => {
    // Check of iemand een temp lobby heeft verlaten
    if (oldState?.channel && oldState.channel.id !== newState?.channel?.id) {
      const em = orm.em.fork();
      const tempChannel = await em.findOne(TempChannel, {
        channelId: oldState.channel.id,
      }, { populate: { guildUser: { guild: true, user: true } } });
      if (tempChannel) {
        await checkTempChannel(client, tempChannel, em, _i18n, logger);
        await em.flush();
      }
    }

    if (newState.channel && newState.channel.parent && oldState.channelId !== newState.channelId) { // Check of iemand een nieuw kanaal is gejoint
      const em = orm.em.fork();
      const { getCategory, getGuildUser } = createEntityCache(em);

      const categoryData = getCategory(newState.channel.parent);
      const guildUserPromise = newState.member?.user ? getGuildUser(newState.member.user, newState.guild) : null;

      const user = newState.member?.user;

      const { channel } = newState;

      let voiceChannel : VoiceChannel;
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
        const activeChannel = await activeTempChannel(client, em, (await guildUserPromise).tempChannel);
        const guildUser = await guildUserPromise;

        if (activeChannel) {
          newState.setChannel(activeChannel);
        } else if (channel.parent) {
          let type : ChannelType = ChannelType.Public;
          if (channel.id === (await categoryData).privateVoice) type = ChannelType.Nojoin;
          if (channel.id === (await categoryData).muteVoice) type = ChannelType.Mute;

          if (!guildUser.guild.isInitialized()) await guildUser.guild.init();

          voiceChannel = await createTempChannel(newState.guild, `${BigInt((await categoryData).lobbyCategory || channel.parent.id)}`, [], user, guildUser.guild.bitrate, type);
          guildUser.tempChannel = new TempChannel(voiceChannel.id, guildUser);

          newState.setChannel(voiceChannel);

          textChannel = await createTextChannel(client, em, guildUser.tempChannel, user);
          guildUser.tempChannel.textChannelId = textChannel.id;

          await createDashBoardCollector(client, voiceChannel, guildUser.tempChannel, em.fork(), _i18n, logger);

          await textChannel.edit({ permissionOverwrites: getTextPermissionOverwrites(voiceChannel, client) });
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

          if (!activeChannel?.permissionsFor(user)?.has(PermissionsBitField.Flags.Speak, true)) {
            await createAddMessage(tempChannel, user, client, em, i18n, logger);
          }
        }
      }

      await em.flush().catch((err) => {
        if (err instanceof UniqueConstraintViolationException) {
          if (voiceChannel.deletable) voiceChannel.delete();
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
