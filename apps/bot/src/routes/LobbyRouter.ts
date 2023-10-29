import Expo from 'expo-server-sdk';
import { ComponentType, OverwriteType } from 'discord-api-types/v9';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  Channel,
  Client,
  CollectedInteraction,
  DiscordAPIError,
  ChannelType as DiscordChannelType,
  Guild as DiscordGuild,
  User as DiscordUser,
  DMChannel,
  EmbedBuilder,
  GuildMember,
  GuildPremiumTier,
  InteractionCollector,
  InteractionUpdateOptions,
  MentionableSelectMenuBuilder,
  MessageActionRowComponentBuilder,
  MessageComponentInteraction,
  MessageEditOptions,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  OverwriteData,
  OverwriteResolvable,
  PermissionsBitField,
  Role,
  Snowflake,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  User,
  VoiceBasedChannel,
  VoiceChannel,
} from 'discord.js';
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import emojiRegex from 'emoji-regex';
import i18next, { i18n as I18n } from 'i18next';
import moment, { Duration } from 'moment';
import { Logger } from 'winston';

import { DrizzleClient } from '@ei/drizzle';
import {
  categories,
  Category,
  User as DbUser,
  Guild,
  guilds,
  GuildUser,
  guildUsers,
  lobbyNameChanges,
  TempChannel,
  tempChannels,
  users,
} from '@ei/drizzle/tables/schema';
import {
  AddUser,
  ChannelType,
  ClientChangeLobby,
  generateLobbyName,
  getIcon,
  RemoveUser,
  userIdToPusherChannel,
} from '@ei/lobby';
import {
  publishLobbyUpdate,
  subscribeToAddUser,
  subscribeToClientLobbyChanges,
  subscribeToLobbyRefresh,
  subscribeToRemoveUser,
} from '@ei/redis';

import { createEntityCache } from '../EiNoah';
import globalLogger from '../logger';
import Router, {
  BothHandler,
  GuildHandler,
  HandlerType,
} from '../router/Router';
import { getLocale } from '../utils/i18nHelper';

const router = new Router(
  'Beheer jouw lobby (kan alleen in het tekstkanaal van jou eigen lobby)',
);

function toDeny(type: ChannelType, textIsSeperate: boolean) {
  const denyList: bigint[] = textIsSeperate
    ? [PermissionsBitField.Flags.SendMessages]
    : [];

  if (type === ChannelType.Mute) denyList.push(PermissionsBitField.Flags.Speak);
  else if (type === ChannelType.Nojoin) {
    denyList.push(
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
    );
  }

  return denyList;
}

function toDenyText(type: ChannelType) {
  if (type === ChannelType.Mute) return [];
  if (type === ChannelType.Nojoin)
    return [PermissionsBitField.Flags.ViewChannel];
  if (type === ChannelType.Public) return [];

  return [];
}

function getChannelType(channel: VoiceBasedChannel) {
  if (
    !channel.permissionOverwrites
      .resolve(channel.guild.id)
      ?.deny.has(PermissionsBitField.Flags.Connect)
  ) {
    if (
      !channel.permissionOverwrites
        .resolve(channel.guild.id)
        ?.deny.has(PermissionsBitField.Flags.Speak)
    )
      return ChannelType.Public;
    return ChannelType.Mute;
  }
  return ChannelType.Nojoin;
}

function getMaxBitrate(guild: DiscordGuild): number {
  if (guild.premiumTier === GuildPremiumTier.Tier1) return 128000;
  if (guild.premiumTier === GuildPremiumTier.Tier2) return 256000;
  if (guild.premiumTier === GuildPremiumTier.Tier3) return 384000;
  return 96000;
}

async function createTempChannel(
  guild: DiscordGuild,
  parent: Snowflake,
  userList: Array<DiscordUser | Role>,
  owner: GuildMember,
  bitrate: number,
  type: ChannelType,
  dbGuild: Guild,
  userLimit = 0,
) {
  const userSnowflakes = [
    ...new Set([...userList.map((user) => user.id), owner.id]),
  ];

  const permissionOverwrites: OverwriteData[] = userSnowflakes.map((id) => ({
    id,
    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
  }));

  const bot = guild.client.user;
  const maxBitrate = getMaxBitrate(guild);

  if (bot !== null) {
    permissionOverwrites.push({
      id: bot.id,
      allow: [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.MuteMembers,
        PermissionsBitField.Flags.MoveMembers,
        PermissionsBitField.Flags.DeafenMembers,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.ManageRoles,
      ],
    });
  }

  permissionOverwrites.push({
    id: owner.id,
    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
  });

  const deny = toDeny(type, dbGuild.seperateTextChannel);

  permissionOverwrites.push({
    id: guild.id,
    deny,
  });

  const name = generateLobbyName(type, owner);

  if (!name) throw new Error('Invalid Name');

  return guild.channels.create({
    type: DiscordChannelType.GuildVoice,
    permissionOverwrites,
    parent,
    bitrate: bitrate < maxBitrate ? bitrate : maxBitrate,
    userLimit,
    name: name.full,
  });
}

async function activeTempChannel(
  client: Client,
  drizzle: DrizzleClient,
  tempChannel?: Pick<TempChannel, 'channelId'>,
): Promise<VoiceChannel | null> {
  if (!tempChannel) return null;

  try {
    const activeChannel = await client.channels.fetch(
      `${BigInt(tempChannel.channelId)}`,
      { cache: true },
    );
    if (activeChannel instanceof VoiceChannel) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.status === 404) {
        drizzle
          .delete(tempChannels)
          .where(eq(tempChannels.channelId, tempChannel.channelId));
        return null;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return null;
}

async function activeTempText(
  client: Client,
  drizzle: DrizzleClient,
  tempChannel?: TempChannel,
): Promise<VoiceChannel | TextChannel | null> {
  if (!tempChannel || !tempChannel.textChannelId) return null;

  try {
    const activeChannel = await client.channels.fetch(
      `${BigInt(tempChannel.textChannelId)}`,
      { cache: true },
    );
    if (
      activeChannel instanceof VoiceChannel ||
      activeChannel instanceof TextChannel
    ) {
      return activeChannel;
    }
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.status === 404) {
        drizzle
          .delete(tempChannels)
          .where(eq(tempChannels.channelId, tempChannel.channelId));
        return null;
      }
      throw Error('Unknown Discord API Error');
    }
  }

  return null;
}

function getTextPermissionOverwrites(
  voice: VoiceChannel,
  client: Client,
): OverwriteData[] {
  return voice.permissionOverwrites.cache.map((overwrite): OverwriteData => {
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
        allow: [
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ViewChannel,
        ],
        type: overwrite.type,
      };
    }

    // Individual overwrites
    return {
      allow: [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.AddReactions,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
      id: overwrite.id,
      type: overwrite.type,
    };
  });
}

async function createTextChannel(
  client: Client,
  voiceChannel: VoiceChannel,
  owner: GuildMember,
  name: string | null,
): Promise<VoiceChannel | TextChannel> {
  const permissionOverwrites: OverwriteData[] = [
    ...getTextPermissionOverwrites(voiceChannel, client),
    {
      id: voiceChannel.guild.id,
      type: OverwriteType.Role,
      deny: PermissionsBitField.Flags.ViewChannel,
    },
  ];

  const generatedName = generateLobbyName(
    getChannelType(voiceChannel),
    owner,
    name,
    true,
  );

  if (!generatedName) throw new Error('Invalid Name');

  return voiceChannel.guild.channels.create({
    type: DiscordChannelType.GuildText,
    parent: voiceChannel.parent || undefined,
    permissionOverwrites,
    name: generatedName.full,
  });
}

function updateTextChannel(
  voice: VoiceChannel,
  text: VoiceChannel | TextChannel,
) {
  if (voice.id === text.id) return Promise.resolve(null);
  return text.permissionOverwrites.set(
    getTextPermissionOverwrites(voice, voice.client),
  );
}

const createCreateChannel = (type: ChannelType, category: CategoryChannel) => {
  const firstLetter = type[0]?.toUpperCase();
  if (!firstLetter) throw new Error('Invalid Type');

  const typeName = `${firstLetter}${type.substring(1, type.length)}`;
  return category.guild.channels.create({
    type: DiscordChannelType.GuildVoice,
    parent: category,
    name: `${getIcon(type)} Create ${typeName} Lobby`,
  });
};

const getChannel = (client: Client, channelId?: string | null) =>
  new Promise<null | Channel>((resolve) => {
    if (!channelId) {
      resolve(null);
      return;
    }
    client.channels
      .fetch(`${BigInt(channelId)}`, { cache: true })
      .then((channel) => resolve(channel))
      .catch(() => resolve(null))
      .finally(() => resolve(null));
  });

const createCreateChannels = async (
  category: Category,
  drizzle: DrizzleClient,
  client: Client,
) => {
  const actualCategory = await client.channels.fetch(`${BigInt(category.id)}`, {
    cache: true,
  });
  if (!(actualCategory instanceof CategoryChannel)) return;

  let publicVoice = await getChannel(client, category.publicVoice);
  if (publicVoice === null) {
    publicVoice = await createCreateChannel(ChannelType.Public, actualCategory);
  }

  let muteVoice = await getChannel(client, category.muteVoice);
  if (muteVoice === null) {
    muteVoice = await createCreateChannel(ChannelType.Mute, actualCategory);
  }

  let privateVoice = await getChannel(client, category.privateVoice);
  if (privateVoice === null) {
    privateVoice = await createCreateChannel(
      ChannelType.Nojoin,
      actualCategory,
    );
  }

  await drizzle
    .update(categories)
    .set({
      publicVoice: publicVoice.id,
      muteVoice: muteVoice.id,
      privateVoice: privateVoice.id,
    })
    .where(
      and(
        eq(categories.id, category.id),
        or(
          ne(categories.publicVoice, publicVoice.id),
          ne(categories.muteVoice, muteVoice.id),
          ne(categories.privateVoice, privateVoice.id),
        ),
      ),
    );
};

interface AddUsersResponse {
  allowedUsersOrRoles: Array<DiscordUser | Role>;
  alreadyAllowed: Array<DiscordUser | Role>;
  alreadyAllowedMessage: string;
  alreadyInMessage: string;
  text: string;
}
const addUsers = async ({
  toAllow,
  activeChannel,
  textChannel,
  i18n,
  tempChannel,
}: {
  toAllow: Array<DiscordUser | Role>;
  activeChannel: VoiceChannel;
  textChannel: TextChannel | VoiceChannel | null;
  i18n?: I18n;
  tempChannel: TempChannel;
}): Promise<AddUsersResponse> => {
  const allowedUsers: Array<DiscordUser | Role> = [];
  const alreadyAllowedUsers: Array<DiscordUser | Role> = [];

  toAllow.forEach((uOrR) => {
    if (
      activeChannel.permissionOverwrites.cache.some((o) => uOrR.id === o.id)
    ) {
      alreadyAllowedUsers.push(uOrR);
      return;
    }
    allowedUsers.push(uOrR);

    if (uOrR instanceof DiscordUser) {
      activeChannel.members.get(uOrR.id)?.voice.setMute(false);
    } else {
      activeChannel.members.each((member) => {
        if (uOrR.members.has(member.id)) member.voice.setMute(false);
      });
    }
  });

  const allow = [
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.ViewChannel,
  ];

  if (tempChannel?.textChannelId !== tempChannel?.channelId)
    allow.push(PermissionsBitField.Flags.SendMessages);

  const newOverwrites: OverwriteResolvable[] = [
    ...activeChannel.permissionOverwrites.cache.values(),
    ...allowedUsers.map(
      (userOrRole): OverwriteResolvable => ({
        id: userOrRole.id,
        allow,
      }),
    ),
  ];

  await activeChannel.permissionOverwrites
    .set(newOverwrites)
    .then(async (newChannel) => {
      if (tempChannel) {
        if (textChannel && newChannel instanceof VoiceChannel) {
          updateTextChannel(newChannel, textChannel);
        }
      }
    })
    .catch(() => globalLogger.error('Overwrite permission error'));

  const allowedUsersMessage = i18n?.t('lobby.userAdded', {
    users: allowedUsers.map((u) => u.toString()),
    count: allowedUsers.length,
  });

  let alreadyInMessage: string;
  if (!alreadyAllowedUsers.length) alreadyInMessage = '';
  else {
    alreadyInMessage =
      i18n?.t('lobby.userAlreadyAdded', {
        users: alreadyAllowedUsers.map((u) => u.toString()),
        count: alreadyAllowedUsers.length,
      }) || '';
  }

  return {
    allowedUsersOrRoles: allowedUsers,
    alreadyAllowed: alreadyAllowedUsers,
    alreadyAllowedMessage: allowedUsersMessage || '',
    alreadyInMessage,
    text: `${allowedUsersMessage}\n${alreadyInMessage}`,
  };
};

router.use(
  'add',
  async ({ params, msg, guildUser, drizzle, flags, i18n }) => {
    const nonUserOrRole = params.filter(
      (param) => !(param instanceof DiscordUser || param instanceof Role),
    );
    const userOrRole = params
      // eslint-disable-next-line max-len
      .filter(
        (param): param is DiscordUser | Role =>
          param instanceof DiscordUser || param instanceof Role,
      );

    flags.forEach((value) => {
      const [user] = value;

      if (user instanceof User || user instanceof Role) userOrRole.push(user);
    });

    if (nonUserOrRole.length > 0) {
      return i18n.t('lobby.error.onlyMentions');
    }

    const [tempChannel] = await drizzle
      .select()
      .from(tempChannels)
      .where(eq(tempChannels.guildUserId, guildUser.id));

    const activeChannel = await activeTempChannel(
      msg.client,
      drizzle,
      tempChannel,
    );

    const textChannel = await activeTempText(msg.client, drizzle, tempChannel);

    if (!activeChannel || !tempChannel) {
      return i18n.t('lobby.error.noLobby');
    }

    if (tempChannel.textChannelId !== msg.channel.id) {
      return i18n.t('lobby.error.useTextChannel', {
        channel: tempChannel.textChannelId,
      });
    }

    return addUsers({
      toAllow: userOrRole,
      activeChannel,
      i18n,
      tempChannel,
      textChannel,
    }).then((res) => res.text);
  },
  HandlerType.GUILD,
  {
    description: 'Add a user or role to the lobby',
    options: [
      {
        name: 'mention',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
        required: true,
      },
      {
        name: '1',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '2',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '3',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '4',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '5',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '6',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '7',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '8',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '9',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '10',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '11',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '12',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '13',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '14',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '15',
        description: 'User or role you want to add',
        type: ApplicationCommandOptionType.Mentionable,
      },
    ],
  },
);

router.useContext(
  'Add To Lobby',
  ApplicationCommandType.User,
  async ({ interaction, drizzle, i18n, getGuildUser }) => {
    const guildUser =
      interaction.guild &&
      (await getGuildUser(interaction.user, interaction.guild));

    if (!guildUser) return i18n.t('error.onlyUsableOnGuild');

    const [tempChannel] = await drizzle
      .select()
      .from(tempChannels)
      .where(eq(tempChannels.guildUserId, guildUser.id));

    const activeChannel =
      tempChannel &&
      (await activeTempChannel(interaction.client, drizzle, tempChannel));
    if (!tempChannel || !activeChannel) return i18n.t('lobby.error.noLobby');

    const textChannel = await activeTempText(
      interaction.client,
      drizzle,
      tempChannel,
    );

    const userToAdd = interaction.options.getUser('user', true);

    const addResponse = await addUsers({
      tempChannel,
      toAllow: [userToAdd],
      activeChannel,
      textChannel,
      i18n,
    });

    if (interaction.channel?.id !== tempChannel.textChannelId) {
      if (
        addResponse.allowedUsersOrRoles.length &&
        interaction.channel?.id !== textChannel?.id &&
        interaction.client.user &&
        textChannel
          ?.permissionsFor(interaction.client.user)
          ?.has(PermissionsBitField.Flags.SendMessages)
      ) {
        textChannel.send(addResponse.alreadyAllowedMessage).catch(() => {});
      }

      return { ephemeral: true, content: addResponse.text };
    }

    return {
      ephemeral: !addResponse.allowedUsersOrRoles.length,
      content: addResponse.text,
    };
  },
);

const removeFromLobby = async (
  channel: VoiceChannel,
  toRemoveUsers: DiscordUser[],
  toRemoveRoles: Role[],
  channelOwner: DiscordUser,
  tempChannel: TempChannel,
  i18n: I18n,
  drizzle: DrizzleClient,
) => {
  if (getChannelType(channel) === ChannelType.Public) {
    return i18n.t('lobby.error.noRemoveInPublic');
  }

  const usersGivenPermissions: GuildMember[] = [];

  const rolesRemoved: Role[] = [];
  const rolesNotRemoved: Role[] = [];

  const deletePromises: Array<Promise<unknown> | undefined> = [];

  toRemoveRoles.forEach((role) => {
    const roleOverwrite = channel.permissionOverwrites.resolve(role.id);

    if (roleOverwrite) {
      role.members.forEach((member) => {
        // eslint-disable-next-line max-len
        if (
          !channel.permissionOverwrites.cache.has(member.id) &&
          channel.members.has(member.id) &&
          !toRemoveUsers.some((user) => user.id === member.id)
        ) {
          deletePromises.push(
            channel.permissionOverwrites.edit(member.id, {
              Connect: true,
              Speak: true,
            }),
          );
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
  const removedList: DiscordUser[] = [];
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
        deletePromises.push(
          channel.permissionOverwrites.resolve(user.id)?.delete(),
        );
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
        message += i18n.t('lobby.rolePluralRemovalUserPluralNotRemoved', {
          users: usersGivenPermissions.map((i) => i.toString()),
        });
      } else {
        message += i18n.t('lobby.roleRemovalUserPluralNotRemoved', {
          users: usersGivenPermissions.map((i) => i.toString()),
        });
      }
    } else if (rolesRemoved.length > 1) {
      message += i18n.t('lobby.rolePluralRemovalUserNotRemoved', {
        users: usersGivenPermissions.map((i) => i.toString()),
      });
    } else {
      message += i18n.t('lobby.roleRemovalUserNotRemoved', {
        users: usersGivenPermissions.map((i) => i.toString()),
      });
    }
    message += i18n.t('lobby.removeThemWith', {
      users: usersGivenPermissions
        .map((member) => `@${member.user.tag}`)
        .join(' '),
    });
  }

  if (notRemoved.length) {
    if (triedRemoveSelf) message += i18n.t('lobby.cantRemoveSelf');
    if (triedRemoveEi) message += i18n.t('lobby.cantRemoveEi');
    message += i18n.t('lobby.couldntBeRemoved', {
      users: notRemoved.map((i) => i.toString()),
      count: notRemoved.length,
    });
  }

  if (removedList.length) {
    message += i18n.t('lobby.usersRemoved', {
      users: removedList.map((i) => i.toString()),
      count: removedList.length,
    });
  }

  if (rolesRemoved.length) {
    message += i18n.t('lobby.rolesRemoved', {
      roles: rolesRemoved.map((i) => i.toString()),
      count: rolesRemoved.length,
    });
  }

  if (rolesNotRemoved.length) {
    message += i18n.t('lobby.rolesNotRemoved', {
      roles: rolesNotRemoved.map((i) => i.toString()),
      count: rolesNotRemoved.length,
    });
  }

  if (!deletePromises.length) return i18n.t('lobby.error.nothingToRemove');

  await Promise.all(deletePromises).then(() => {
    if (tempChannel) {
      const tempText = activeTempText(channel.client, drizzle, tempChannel);
      tempText.then((text) => {
        if (text) updateTextChannel(channel, text);
      });
    }
  });

  return message;
};

router.use(
  'remove',
  async ({ params, msg, guildUser, drizzle, flags, i18n }) => {
    const nonUsersOrRoles = params.filter(
      (param) => !(param instanceof DiscordUser || param instanceof Role),
    );
    const userList = params.filter(
      (param): param is DiscordUser => param instanceof DiscordUser,
    );
    const roles = params.filter(
      (param): param is Role => param instanceof Role,
    );
    const requestingUser = msg.user;

    flags.forEach((value) => {
      const [user] = value;

      if (user instanceof User) userList.push(user);
      if (user instanceof Role) roles.push(user);
    });

    if (nonUsersOrRoles.length > 0) {
      return i18n.t('lobby.error.onlyMentions');
    }

    const [tempChannel] = await drizzle
      .select()
      .from(tempChannels)
      .where(eq(tempChannels.guildUserId, guildUser.id));

    const activeChannel = await activeTempChannel(
      msg.client,
      drizzle,
      tempChannel,
    );

    if (!activeChannel || !tempChannel) {
      return i18n.t('lobby.error.noLobby');
    }

    if (tempChannel.textChannelId !== msg.channel.id) {
      return i18n.t('lobby.error.useTextChannel', {
        channel: tempChannel.textChannelId,
      });
    }

    return removeFromLobby(
      activeChannel,
      userList,
      roles,
      requestingUser,
      tempChannel,
      i18n,
      drizzle,
    );
  },
  HandlerType.GUILD,
  {
    description: 'Remove selected users and roles from the lobby',
    options: [
      {
        name: 'mention',
        type: ApplicationCommandOptionType.Mentionable,
        description: 'Person or role to remove',
        required: true,
      },
      {
        name: '1',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '2',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '3',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '4',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '5',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '6',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '7',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '8',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '9',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '10',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '11',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '12',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '13',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '14',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
      {
        name: '15',
        description: 'Person or role to remove',
        type: ApplicationCommandOptionType.Mentionable,
      },
    ],
  },
);

const generateComponents = async (
  voiceChannel: VoiceBasedChannel,
  drizzle: DrizzleClient,
  guildUser: GuildUser,
  owner: GuildMember,
  i18n: I18n,
): Promise<ActionRowBuilder<MessageActionRowComponentBuilder>[]> => {
  const currentType = getChannelType(voiceChannel);

  /*
  const query = em
    .createQueryBuilder(LobbyNameChange, 'lnc')
    .where({ guildUser })
    .select(['name', 'max(date) as "date"'])
    .groupBy(['name'])
    .getKnexQuery()
    .orderBy('date', 'desc')
    .limit(25);

    const latestNameChanges = await em
      .getConnection()
      .execute<LobbyNameChange[]>(query);
  */

  const latestNameChanges = await drizzle
    .select({
      name: lobbyNameChanges.name,
      date: sql`max(${lobbyNameChanges.date}) as date`,
    })
    .from(lobbyNameChanges)
    .where(eq(lobbyNameChanges.guildUserId, guildUser.id))
    .groupBy(lobbyNameChanges.name)
    .orderBy(desc(sql`date`))
    .limit(25);

  const selectMenu = new StringSelectMenuBuilder();
  selectMenu.setCustomId('name');
  selectMenu.setPlaceholder(i18n.t('lobby.noNameSelected'));
  selectMenu.addOptions(
    latestNameChanges.map((ltc): StringSelectMenuOptionBuilder => {
      const generatedName = generateLobbyName(currentType, owner, ltc.name);

      if (!generatedName) throw new Error('Invalid Name');

      const icon = emojiRegex().exec(generatedName.full)?.[0];

      return new StringSelectMenuOptionBuilder()
        .setLabel(
          icon
            ? generatedName.full.substring(icon?.length).trim()
            : generatedName.full,
        )
        .setEmoji({ name: icon })
        .setDefault(generatedName.full === voiceChannel.name)
        .setValue(ltc.name);
    }),
  );

  const limitRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

  limitRow.addComponents([
    new ButtonBuilder({
      customId: '0',
      label: i18n.t('lobby.none') || 'none',
      style:
        voiceChannel.userLimit === 0
          ? ButtonStyle.Success
          : ButtonStyle.Secondary,
      disabled: voiceChannel.userLimit === 0,
    }),
  ]);

  limitRow.addComponents(
    [2, 5, 10, 12].map(
      (n) =>
        new ButtonBuilder({
          customId: `${n}`,
          label: `${n}`,
          style:
            voiceChannel.userLimit === n
              ? ButtonStyle.Success
              : ButtonStyle.Secondary,
          disabled: voiceChannel.userLimit === n,
        }),
    ),
  );

  const channelTypeButtons =
    new ActionRowBuilder<MessageActionRowComponentBuilder>();
  channelTypeButtons.addComponents(
    Object.entries(ChannelType).map(
      ([, type]) =>
        new ButtonBuilder({
          customId: type,
          emoji: { name: getIcon(type) },
          label: `${type[0]?.toUpperCase()}${type.substring(1)}`,
          style:
            currentType === type ? ButtonStyle.Success : ButtonStyle.Secondary,
          disabled: currentType === type,
        }),
    ),
  );

  const selectUsersRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>();
  const selectUser = new MentionableSelectMenuBuilder()
    .setPlaceholder(i18n.t('lobby.addUserMenuPlaceholder'))
    .setMaxValues(25)
    .setCustomId('users');

  selectUsersRow.addComponents([selectUser]);

  const actionRows = [channelTypeButtons, limitRow, selectUsersRow];

  const selectNameRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>();
  selectNameRow.addComponents([selectMenu]);

  if (latestNameChanges.length > 0) {
    actionRows.push(selectNameRow);
  }

  const renameButtonRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>();
  renameButtonRow.addComponents([
    new ButtonBuilder({
      style: ButtonStyle.Secondary,
      customId: 'open-rename-modal',
      label: i18n.t('lobby.renameButton'),
      emoji: { name: '✏' },
    }),
  ]);

  actionRows.push(renameButtonRow);

  return actionRows;
};

const getDashboardOptions = (
  i18n: I18n,
  guild: DiscordGuild,
  leader: GuildMember,
  timeTill?: Duration,
  newName?: string,
): BaseMessageOptions => {
  const text = `${i18n.t('lobby.dashboardText', { joinArrays: '\n' })}`;
  const embed = new EmbedBuilder();

  const avatarURL = leader.displayAvatarURL({ size: 64, extension: 'webp' });
  const color: number | undefined = guild.members.me?.displayColor || 0xffcc5f;

  embed.setAuthor({
    name: i18n.t('lobby.leader', { user: leader.displayName }),
    iconURL: avatarURL,
  });

  embed.setDescription(text);

  if (timeTill && newName) {
    embed.setFooter({
      text: i18n.t('lobby.nameOfLobbyChangeDuration', {
        duration: timeTill.locale(i18n.language).humanize(true),
        name: newName,
      }),
    });
  }

  if (color) embed.setColor(color);

  return { embeds: [embed] };
};

interface NameChangeTimeout {
  changes: Date[];
  timeout?: NodeJS.Timeout;
}

const pushLobbyToUser = (
  user: Pick<GuildMember, 'id'>,
  data: {
    member: GuildMember;
    guild: DiscordGuild;
    tempChannel: TempChannel;
    voiceChannel: VoiceBasedChannel;
    timeTillLobbyChange: Duration | null;
  } | null,
) => {
  globalLogger.debug('pushing lobby to user');

  const dataToSend = !data
    ? null
    : {
        user: {
          id: user.id,
          displayName: data.member.displayName,
        },
        guild: {
          id: data.guild.id,
          name: data.guild.name,
          icon: data.guild.iconURL({
            forceStatic: true,
            size: 512,
            extension: 'png',
          }),
        },
        channel: {
          id: data.voiceChannel.id,
          name: data.tempChannel.name || null,
          type: getChannelType(data.voiceChannel),
          limit: data.voiceChannel.userLimit,
          lobbyNameChangeDate: data.timeTillLobbyChange
            ? moment.now() + data.timeTillLobbyChange.asMilliseconds()
            : null,
        },
        users: data.voiceChannel.members
          .map((member) => ({
            id: member.id,
            avatar: member.user.displayAvatarURL({
              forceStatic: true,
              size: 128,
              extension: 'png',
            }),
            username: member.displayName,
            isAllowed: data.voiceChannel.permissionOverwrites.cache.has(
              member.id,
            ),
            isKickable:
              member.id !== user.id && member.id !== member.client.user.id,
          }))
          .filter((u) => u.id !== user.id),
      };

  globalLogger.debug('data to send', { dataToSend });

  publishLobbyUpdate(dataToSend, user.id);
};

const changeLobby = (() => {
  const timeouts = new Map<Snowflake, NameChangeTimeout>();

  return async (
    requiredOptions: {
      tempChannel: TempChannel;
      voiceChannel: VoiceBasedChannel;
      owner: GuildMember;
      guild: DiscordGuild;
      drizzle: DrizzleClient;
      i18n: I18n;
    },
    options?: {
      changeTo?: ChannelType;
      limit?: number;
      interaction?: MessageComponentInteraction | null;
      forcePermissionUpdate?: boolean;
    },
  ) => {
    const { tempChannel, voiceChannel, owner, guild, drizzle, i18n } =
      requiredOptions;

    const { changeTo, limit, forcePermissionUpdate, interaction } =
      options ?? {};

    const currentType = getChannelType(voiceChannel);
    const textChannel = activeTempText(guild.client, drizzle, tempChannel);

    const [guildUser] = await drizzle
      .select()
      .from(guildUsers)
      .where(eq(guildUsers.userId, owner.id));

    const deny = toDeny(
      changeTo ?? currentType,
      voiceChannel.id !== (await textChannel)?.id,
    );

    if ((changeTo && changeTo !== currentType) || forcePermissionUpdate) {
      const newOverwrites =
        currentType === ChannelType.Public
          ? voiceChannel.members
              .filter(
                (member) =>
                  !voiceChannel.permissionOverwrites.cache.has(member.id),
              )
              .map(
                (member): OverwriteResolvable => ({
                  id: member.id,
                  allow: [
                    PermissionsBitField.Flags.Speak,
                    PermissionsBitField.Flags.Connect,
                  ],
                }),
              )
          : [];

      if (currentType === ChannelType.Mute && changeTo === ChannelType.Public) {
        voiceChannel.members
          .filter(
            (member) => !voiceChannel.permissionOverwrites.cache.has(member.id),
          )
          .forEach((member) => member.voice.setMute(false));
      } else if (
        currentType === ChannelType.Mute &&
        changeTo === ChannelType.Nojoin
      ) {
        voiceChannel.members
          .filter(
            (member) => !voiceChannel.permissionOverwrites.cache.has(member.id),
          )
          .forEach((member) => {
            member.voice.setChannel(null).catch(() => {});
            member
              .send(
                i18n.t('lobby.typeChangeRemoval', {
                  owner: owner.toString(),
                  type: changeTo,
                }),
              )
              .catch(() => {});
          });
      }

      await voiceChannel.permissionOverwrites
        .set([
          ...voiceChannel.permissionOverwrites.cache.values(),
          { id: guild.id, deny },
          ...newOverwrites,
        ])
        .then(async (voice) => {
          const tc = await textChannel;
          if (tc && voice instanceof VoiceChannel) {
            return updateTextChannel(voice, tc);
          }
          return null;
        })
        .catch((error) => globalLogger.error(error.description, { error }));
    }

    const newName = generateLobbyName(
      changeTo ?? currentType,
      owner,
      tempChannel.name,
    );
    if (!newName) throw new Error('Invalid Lobby Name');

    const currentName = await voiceChannel
      .fetch(false)
      .then((vc) => (vc instanceof VoiceChannel && vc.name) || null)
      .catch(() => null);
    let timeTillNameChange: Duration | undefined;

    if (newName.full !== currentName) {
      if (tempChannel.name) {
        await drizzle.insert(lobbyNameChanges).values([
          {
            name: tempChannel.name,
            guildUserId: tempChannel.guildUserId,
            date: new Date().toISOString(),
          },
        ]);
      }

      const timeout = timeouts.get(voiceChannel.id) ?? {
        changes: [],
      };
      const execute = async (isTimeout: boolean) => {
        await Promise.all([
          voiceChannel.fetch(false).catch(() => null),
          (await textChannel)?.fetch(false).catch(() => null),
        ])
          .then(async ([vc, tc]) => {
            const newVoiceName = generateLobbyName(
              changeTo ?? currentType,
              owner,
              tempChannel.name,
            );
            const newTextName = generateLobbyName(
              changeTo ?? currentType,
              owner,
              tempChannel.name,
              true,
            );

            if (!newVoiceName || !newTextName)
              throw new Error('Invalid Name Given');

            if (vc && vc instanceof VoiceChannel) {
              await vc
                .setName(newVoiceName.full)
                .then(() => {
                  timeout.changes.push(new Date());
                  timeouts.set(voiceChannel.id, timeout);
                })
                .catch(() => {});

              if (tc?.type === DiscordChannelType.GuildText && guildUser) {
                await tc
                  .setName(newTextName.full)
                  .then(() => {
                    if (tempChannel.controlDashboardId) {
                      return tc.messages.fetch({
                        message: `${BigInt(tempChannel.controlDashboardId)}`,
                        cache: true,
                      });
                    }

                    return null;
                  })
                  .then(
                    async (msg) =>
                      msg?.edit({
                        ...(<MessageEditOptions>(
                          getDashboardOptions(i18n, guild, owner)
                        )),
                        components: await generateComponents(
                          voiceChannel,
                          drizzle,
                          guildUser,
                          owner,
                          i18n,
                        ),
                      }),
                  )
                  .catch(() => {});
              }
            } else {
              timeouts.delete(voiceChannel.id);
            }
          })
          .finally(() => {
            if (!isTimeout) return;
            pushLobbyToUser(owner, {
              member: owner,
              guild,
              tempChannel,
              voiceChannel,
              timeTillLobbyChange: null,
            });
          });
      };

      const timePeriod = 1000 * 60 * 10;
      const maxChanges = 3;

      timeout.changes = timeout.changes.filter(
        (date) => date.getTime() > new Date().getTime() - timePeriod,
      );

      if (timeout.changes.length < maxChanges - 1) {
        await execute(false);
      } else {
        const date = timeout.changes.sort(
          (a, b) => a.getTime() - b.getTime(),
        )[0];

        if (!date) {
          await execute(false);
        } else {
          const timeTo = date.getTime() + timePeriod - new Date().getTime();
          timeTillNameChange = moment.duration(timeTo, 'milliseconds');

          if (timeout.timeout) clearTimeout(timeout.timeout);
          timeout.timeout = setTimeout(() => execute(true), timeTo);
        }
      }
    } else {
      const timeout = timeouts.get(voiceChannel.id);
      if (timeout?.timeout) clearTimeout(timeout.timeout);
    }

    if (limit !== undefined && voiceChannel.userLimit !== limit) {
      await voiceChannel.setUserLimit(limit);
    }

    const content = getDashboardOptions(
      i18n,
      guild,
      owner,
      timeTillNameChange,
      newName.full,
    );

    if (
      !(
        interaction &&
        guildUser &&
        (await interaction
          .update({
            ...(<InteractionUpdateOptions>content),
            components: await generateComponents(
              voiceChannel,
              drizzle,
              guildUser,
              owner,
              i18n,
            ),
          })
          .then(() => true)
          .catch(() => false))
      ) &&
      tempChannel.controlDashboardId
    ) {
      const msg = await (
        await textChannel
      )?.messages
        .fetch({
          message: `${BigInt(tempChannel.controlDashboardId)}`,
          cache: true,
        })
        .catch(() => null);
      if (msg && guildUser) {
        msg
          .edit({
            ...(<MessageEditOptions>content),
            components: await generateComponents(
              voiceChannel,
              drizzle,
              guildUser,
              owner,
              i18n,
            ),
          })
          .catch(() => {});
      }
    }

    pushLobbyToUser(owner, {
      member: owner,
      guild,
      tempChannel,
      voiceChannel,
      timeTillLobbyChange: timeTillNameChange || null,
    });

    return timeTillNameChange;
  };
})();

const changeTypeHandler: GuildHandler = async ({
  params,
  msg,
  guildUser,
  drizzle,
  flags,
  i18n,
}) => {
  const requestingUser = msg.member;
  if (
    msg.channel instanceof DMChannel ||
    msg.guild === null ||
    guildUser === null
  ) {
    return i18n.t('error.onlyUsableOnGuild');
  }
  const lobbyOwner = guildUser;

  const [tempChannel] = await drizzle
    .select()
    .from(tempChannels)
    .where(eq(tempChannels.guildUserId, lobbyOwner.id));

  const activeChannel = await activeTempChannel(
    msg.client,
    drizzle,
    tempChannel,
  );

  if (!activeChannel || !tempChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (tempChannel.textChannelId !== msg.channel.id) {
    return i18n.t('lobby.error.useTextChannel', {
      channel: tempChannel.textChannelId,
    });
  }

  if (params.length > 1) {
    return i18n.t('lobby.error.onlyOneArgumentExpected');
  }

  const type = getChannelType(activeChannel);

  const [typeGiven] = flags.get('type') || params;

  const otherTypes = Object.values(ChannelType)
    .filter((t) => t !== type)
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

  changeLobby(
    {
      tempChannel,
      voiceChannel: activeChannel,
      owner: requestingUser,
      guild: msg.guild,
      drizzle,
      i18n,
    },
    {
      changeTo,
      forcePermissionUpdate: true,
    },
  );

  return i18n.t('lobby.lobbyTypeChangedTo', { type: changeTo });
};

router.use('type', changeTypeHandler, HandlerType.GUILD, {
  description: 'Change the type of the lobby',
  options: [
    {
      name: 'type',
      description: 'Type you want to change your lobby to',
      choices: Object.values(ChannelType).map((t) => ({
        name: `${getIcon(t)} ${t[0]?.toUpperCase()}${t.substring(1)}`,
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

const sizeHandler: GuildHandler = async ({
  msg,
  guildUser,
  params,
  drizzle,
  flags,
  i18n,
}) => {
  const [tempChannel] = await drizzle
    .select()
    .from(tempChannels)
    .where(eq(tempChannels.guildUserId, guildUser.id));

  const activeChannel = await activeTempChannel(
    msg.client,
    drizzle,
    tempChannel,
  );
  const requestingUser = msg.member;

  if (!tempChannel || !activeChannel) {
    return i18n.t('lobby.error.noLobby');
  }

  if (tempChannel.textChannelId !== msg.channel.id) {
    return i18n.t('lobby.error.useTextChannel', {
      channel: tempChannel.textChannelId,
    });
  }

  const [sizeParam] = flags.get('size') || params;

  if (typeof sizeParam !== 'string' && typeof sizeParam !== 'number') {
    return i18n.t('lobby.error.numberExpected');
  }

  let size =
    typeof sizeParam === 'number' ? sizeParam : Number.parseInt(sizeParam, 10);

  if (
    sizeParam.toString().toLowerCase() === 'none' ||
    sizeParam.toString().toLowerCase() === 'remove'
  ) {
    size = 0;
  }

  if (!Number.isSafeInteger(size)) {
    return i18n.t('lobby.error.notSaveInt');
  }

  if (size > 99) {
    size = 99;
  }

  if (size < 0) {
    size = 0;
  }

  await changeLobby(
    {
      tempChannel,
      voiceChannel: activeChannel,
      owner: requestingUser,
      guild: msg.guild,
      drizzle,
      i18n,
    },
    {
      limit: size,
    },
  );

  if (size === 0) return i18n.t('lobby.limitRemoved');

  return i18n.t('lobby.limitChanged', { changedTo: size });
};

router.use('size', sizeHandler, HandlerType.GUILD);
router.use('limit', sizeHandler, HandlerType.GUILD, {
  description: 'Limit your lobby size',
  options: [
    {
      name: 'size',
      description: 'Limit you want to set',
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
  ],
});
router.use('userlimit', sizeHandler, HandlerType.GUILD);

router.use(
  'lobby-category',
  async ({ params, msg, flags, i18n, drizzle, getCategory }) => {
    if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return i18n.t('error.notAdmin');
    }

    let [createCategory] = flags.get('create-category') || [null];
    let [lobbyCategory] = flags.get('lobby-category') || [null];

    if (!createCategory) [createCategory] = params;
    if (!lobbyCategory) [, lobbyCategory] = params;

    if (typeof createCategory === 'string') {
      createCategory = await msg.client.channels
        .fetch(`${BigInt(createCategory)}`, { cache: true })
        .catch(() => null);
    }
    if (typeof lobbyCategory === 'string') {
      lobbyCategory = await msg.client.channels
        .fetch(`${BigInt(lobbyCategory)}`, { cache: true })
        .catch(() => null);
    }

    if (!(createCategory instanceof CategoryChannel))
      return i18n.t('lobby.error.createNotACategory');
    if (!(lobbyCategory instanceof CategoryChannel))
      return i18n.t('lobby.error.lobbyNotACategory');

    if (createCategory.guild !== msg.guild)
      return i18n.t('lobby.error.createNotInGuild');
    if (lobbyCategory.guild !== msg.guild)
      return i18n.t('lobby.error.lobbyNotInGuild');

    const createCategoryData = await getCategory(createCategory);
    if (createCategoryData.lobbyCategory === lobbyCategory.id) {
      await drizzle
        .update(categories)
        .set({ lobbyCategory: null })
        .where(eq(categories.id, createCategoryData.id));

      return i18n.t('lobby.removedLobbyCategory', {
        category: lobbyCategory.name,
      });
    }

    await drizzle
      .update(categories)
      .set({ lobbyCategory: lobbyCategory.id })
      .where(eq(categories.id, createCategoryData.id));

    return i18n.t('lobby.nowLobbyCategory', { category: lobbyCategory.name });
  },
  HandlerType.GUILD,
  {
    description: 'Select where the lobbies are placed',
    options: [
      {
        name: 'create-category',
        description: 'Category where the create-channels are placed',
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
      {
        name: 'lobby-category',
        description: 'The category the created lobbies should be placed',
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
    ],
  },
);

router.use(
  'create-category',
  async ({ params, msg, flags, i18n, drizzle, getCategory }) => {
    if (!msg.client.user) throw new Error('msg.client.user not set somehow');

    let [category] = flags.get('category') || [null];

    if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return i18n.t('error.noAdmin');
    }

    if (!category && typeof params[0] === 'string') {
      category = await msg.client.channels
        .fetch(`${BigInt(params[0])}`, { cache: true })
        .catch(() => null);
    }

    if (!(category instanceof CategoryChannel))
      return i18n.t('lobby.error.notCategory');
    if (category.guild !== msg.guild)
      return i18n.t('lobby.error.categoryNotInGuild');

    if (
      !category
        .permissionsFor(msg.client.user)
        ?.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return i18n.t('lobby.error.noChannelCreatePermission');
    }

    if (
      !category
        .permissionsFor(msg.client.user)
        ?.has(PermissionsBitField.Flags.MoveMembers)
    ) {
      return i18n.t('lobby.error.noMovePermission');
    }

    const categoryData = await getCategory(category);

    if (
      !categoryData.publicVoice ||
      !categoryData.muteVoice ||
      !categoryData.privateVoice
    ) {
      await createCreateChannels(categoryData, drizzle, msg.client);

      return i18n.t('lobby.nowLobbyCreateCategory', {
        category: category.name,
      });
    }

    return Promise.all([
      getChannel(msg.client, categoryData.publicVoice).then<
        Channel | undefined
      >((channel) => channel?.delete()),
      getChannel(msg.client, categoryData.privateVoice).then<
        Channel | undefined
      >((channel) => channel?.delete()),
      getChannel(msg.client, categoryData.muteVoice).then<Channel | undefined>(
        (channel) => channel?.delete(),
      ),
    ])
      .then(async () => {
        await drizzle
          .update(categories)
          .set({
            publicVoice: null,
            privateVoice: null,
            muteVoice: null,
          })
          .where(eq(categories.id, categoryData.id));

        if (category instanceof CategoryChannel)
          i18n.t('lobby.removedCreateCategory', { category: category.name });
        return i18n.t('lobby.removedCreateCategoryNoCategory');
      })
      .catch(() => i18n.t('lobby.error.somethingWentWrong'));
  },
  HandlerType.GUILD,
  {
    description: 'Add or remove a lobby-create category',
    options: [
      {
        name: 'category',
        description: 'The category where the create-channels are placed in',
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
    ],
  },
);

router.use(
  'bitrate',
  async ({ msg, params, flags, i18n, drizzle, getGuild }) => {
    const [bitrate] = flags.get('bitrate') || params;

    const guild = await getGuild(msg.guild);

    if (!guild) {
      return i18n.t('lobby.error.noGuild');
    }

    if (!bitrate) {
      return i18n.t('lobby.lobbyBitrateIs', {
        bitrate: guild.bitrate,
      });
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

    await drizzle
      .update(guilds)
      .set({ bitrate: newBitrate })
      .where(eq(guilds.id, guild.id));

    return i18n.t('lobby.bitrateChanged', { bitrate: newBitrate });
  },
  HandlerType.GUILD,
  {
    description: 'Set the bitrate for created lobbies',
    options: [
      {
        name: 'bitrate',
        description: 'Bitrate for created lobbies',
        required: true,
        type: ApplicationCommandOptionType.Integer,
      },
    ],
  },
);

const changeDatabaseChannelName = async (
  drizzle: DrizzleClient,
  tempChannel: TempChannel,
  newName: string | null,
) =>
  drizzle
    .update(tempChannels)
    .set({ name: newName })
    .where(eq(tempChannels.channelId, tempChannel.channelId))
    .returning({
      name: tempChannels.name,
      guildUserId: tempChannels.guildUserId,
      channelId: tempChannels.channelId,
      textChannelId: tempChannels.textChannelId,
      controlDashboardId: tempChannels.controlDashboardId,
      createdAt: tempChannels.createdAt,
    });

const nameHandler: GuildHandler = async ({
  params,
  guildUser,
  msg,
  drizzle,
  flags,
  i18n,
}) => {
  const requestingUser = msg.member;

  const rawNameArray = flags.get('name') || params;

  const [tempChannel] = await drizzle
    .select()
    .from(tempChannels)
    .where(eq(tempChannels.guildUserId, guildUser.id));

  globalLogger.debug('tempChannel', { tempChannel, guildUser });

  const activeChannel = await activeTempChannel(
    msg.client,
    drizzle,
    tempChannel,
  );

  if (!activeChannel || !tempChannel) return i18n.t('lobby.error.noLobby');
  if (tempChannel.textChannelId !== msg.channel.id) {
    return i18n.t('lobby.error.useTextChannel', {
      channel: tempChannel.textChannelId,
    });
  }

  if (!rawNameArray.length) return i18n.t('lobby.error.noNameGiven');

  const nameArray = rawNameArray.filter(
    (param): param is string => typeof param === 'string',
  );
  if (nameArray.length !== rawNameArray.length)
    return i18n.t('lobby.error.onlyUseText');

  const name = nameArray.join(' ');

  if (name.length > 80) return i18n.t('lobby.error.nameLimit');

  const [renamedTempChannel] = await changeDatabaseChannelName(
    drizzle,
    tempChannel,
    name,
  );
  const type = getChannelType(activeChannel);

  if (!renamedTempChannel) return i18n.t('lobby.error.noLobby');

  try {
    const timeTillChange = await changeLobby({
      tempChannel: renamedTempChannel,
      voiceChannel: activeChannel,
      owner: requestingUser,
      guild: msg.guild,
      drizzle,
      i18n,
    });
    const newName = generateLobbyName(
      type,
      requestingUser,
      renamedTempChannel.name,
      false,
    )?.full;

    if (timeTillChange) {
      return await i18n.t('lobby.lobbyNameChangeTimeLimit', {
        duration: timeTillChange.locale(i18n.language).humanize(true),
        name: newName,
      });
    }

    return await i18n.t('lobby.lobbyNameChanged', { name: newName });
  } catch {
    return i18n.t('lobby.error.noEmojiOnly');
  }
};

router.use('name', nameHandler, HandlerType.GUILD, {
  description: 'Change the name of your lobby',
  options: [
    {
      name: 'name',
      description: 'New name of your lobby',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
});

router.use(
  'text-in-voice',
  async ({ flags, msg, i18n, getGuild, drizzle }) => {
    const guild = await getGuild(msg.guild);

    if (!guild) return i18n.t('lobby.error.noGuild');

    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return i18n.t('lobby.error.notAdmin');

    const [enable] = flags.get('enable') || [true];

    if (typeof enable !== 'boolean') return i18n.t('lobby.error.notABoolean');

    await drizzle
      .update(guilds)
      .set({ seperateTextChannel: !enable })
      .where(eq(guilds.id, guild.id));

    if (enable) return i18n.t('lobby.textInVoice.enabled');
    return i18n.t('lobby.textInVoice.disabled');
  },
  HandlerType.GUILD,
  {
    description: 'Should lobbies use text-in-voice or not',
    options: [
      {
        name: 'enable',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Enable text-in-voice',
        required: true,
      },
    ],
  },
);

const helpHandler: BothHandler = ({ i18n }) =>
  i18n.t('lobby.helpText', { joinArrays: '\n' });

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Get help',
});

const createAddMessage = async (
  tempChannel: TempChannel,
  guildUser: GuildUser,
  user: User,
  client: Client,
  drizzle: DrizzleClient,
  i18n: I18n,
) => {
  if (!tempChannel.textChannelId) throw new Error('Text channel not defined');

  const textChannel = await activeTempText(client, drizzle, tempChannel);
  if (!textChannel?.isTextBased()) throw new Error('Text channel not found');

  const activeChannel = await activeTempChannel(client, drizzle, tempChannel);
  if (!activeChannel) throw new Error('No active temp channel');

  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  actionRow.addComponents([
    new ButtonBuilder({
      customId: 'add',
      label: i18n.t('lobby.addUserButton') || 'Add User',
      style: ButtonStyle.Success,
    }),
  ]);

  textChannel
    .send({
      allowedMentions: { roles: [], users: [] },
      content: i18n.t('lobby.addUserMessage', { user: user.toString() }),
      components: [actionRow],
    })
    .then((msg) => {
      const collector =
        msg.createMessageComponentCollector<ComponentType.Button>();
      collector.on('collect', async (interaction) => {
        if (
          interaction.user.id === guildUser.userId &&
          interaction.customId === 'add'
        ) {
          interaction.update({
            content: (
              await addUsers({
                toAllow: [user],
                activeChannel,
                textChannel,
                i18n,
                tempChannel,
              })
            ).text,
            components: [],
          });
          return;
        }

        const owner = await interaction.guild?.members
          .fetch({
            cache: true,
            user: `${BigInt(guildUser.userId)}`,
          })
          .catch(() => undefined);

        let message;
        if (!owner) {
          message = i18n.t('lobby.error.onlyOwnerCanAllow');
        } else {
          message = i18n.t('lobby.error.onlyOwnerCanAllowUser', {
            user: owner.toString(),
          });
        }

        interaction
          .reply({ content: message, ephemeral: true })
          .catch(() => {});
      });
    });
};

const msgCollectors = new Map<
  Snowflake,
  InteractionCollector<CollectedInteraction>
>();

const createDashBoardCollector = async ({
  client,
  voiceChannel,
  tempChannel,
  guildUser,
  dbUser,
  dbGuild,
  drizzle,
  _i18n,
}: {
  client: Client;
  voiceChannel: VoiceChannel;
  tempChannel: TempChannel;
  guildUser: GuildUser;
  dbUser: DbUser;
  dbGuild: Guild;
  drizzle: DrizzleClient;
  _i18n: I18n;
}) => {
  const textChannel = await activeTempText(client, drizzle, tempChannel);
  const guild = await client.guilds
    .fetch({ cache: true, guild: guildUser.guildId })
    .catch(() => null);
  const owner = await guild?.members
    ?.fetch({ user: guildUser.userId, cache: true })
    ?.catch(() => null);
  const i18 = _i18n.cloneInstance({
    lng: dbUser.language || dbGuild.language || undefined,
  });

  if (textChannel && owner) {
    let msg = tempChannel.controlDashboardId
      ? await textChannel.messages
          .fetch({
            message: `${BigInt(tempChannel.controlDashboardId)}`,
            cache: true,
          })
          .catch(() => undefined)
      : undefined;
    if (!msg) {
      msg = await textChannel
        .send({
          ...getDashboardOptions(i18, textChannel.guild, owner),
          components: await generateComponents(
            voiceChannel,
            drizzle,
            guildUser,
            owner,
            i18,
          ).catch((error) => {
            globalLogger.error(error.description, { error });
            return undefined;
          }),
        })
        .catch((err) => {
          globalLogger.error(err.description, { error: err });
          return undefined;
        });

      if (msg)
        await drizzle
          .update(tempChannels)
          .set({ controlDashboardId: msg.id })
          .where(eq(tempChannels.channelId, tempChannel.channelId));
    }

    // TODO: Fix dat dit weer werkt
    // if (!msg?.pinned && msg?.pinnable && client.user && textChannel.permissionsFor(client.user, true)?.has(PermissionsBitField.Flags.ManageMessages)) await msg.pin();

    if (msg && !msgCollectors.has(msg.id)) {
      const collector = new InteractionCollector(client, { message: msg });
      collector.on('collect', async (interaction) => {
        const [currentTempChannel] = await drizzle
          .select()
          .from(tempChannels)
          .where(eq(tempChannels.channelId, voiceChannel.id))
          .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
          .innerJoin(users, eq(guildUsers.userId, users.id))
          .innerJoin(guilds, eq(guildUsers.guildId, guilds.id));

        if (
          (interaction.isMessageComponent() || interaction.isModalSubmit()) &&
          currentTempChannel &&
          interaction.guild
        ) {
          const i18n = _i18n.cloneInstance({
            lng:
              currentTempChannel.user.language ||
              currentTempChannel.guild.language ||
              undefined,
          });
          if (interaction.user.id !== currentTempChannel.user.id) {
            interaction.reply({
              content: i18n.t('lobby.error.onlyOwner'),
              ephemeral: true,
            });
            return;
          }

          const { member } = interaction;
          if (!(member instanceof GuildMember)) {
            interaction.reply({ content: i18n.t('error.onlyUsableOnGuilds') });
            return;
          }

          const limit = Number.parseInt(interaction.customId, 10);
          const currentType = getChannelType(voiceChannel);

          if (interaction.isModalSubmit()) {
            const newName = interaction.fields.getTextInputValue('name');

            try {
              const voiceName = generateLobbyName(
                currentType,
                member,
                newName,
                false,
              )?.full;

              const [renamedTempChannel] = await changeDatabaseChannelName(
                drizzle,
                currentTempChannel.temp_channel,
                newName,
              );

              if (!renamedTempChannel) {
                interaction.reply({
                  content: i18n.t('lobby.error.noLobby'),
                  ephemeral: true,
                });
                return;
              }

              const duration = await changeLobby({
                tempChannel: renamedTempChannel,
                voiceChannel,
                owner: member,
                guild: interaction.guild,
                drizzle,
                i18n,
              });

              interaction
                .reply({
                  ephemeral: true,
                  content: duration
                    ? i18n.t('lobby.lobbyNameChangeTimeLimit', {
                        duration: duration.humanize(true),
                        name: voiceName,
                      })
                    : i18n.t('lobby.lobbyNameChanged', { name: voiceName }),
                })
                .catch((err) =>
                  globalLogger.error(err.description, { error: err }),
                );
            } catch (err) {
              interaction.reply({
                content: i18n.t('lobby.error.noEmojiOnly'),
                ephemeral: true,
              });
            }
          } else if (Number.isSafeInteger(limit)) {
            if (limit >= 0 && limit < 100 && interaction.guild) {
              await changeLobby(
                {
                  tempChannel: currentTempChannel.temp_channel,
                  voiceChannel,
                  owner: member,
                  guild: interaction.guild,
                  drizzle,
                  i18n,
                },
                {
                  limit,
                  interaction,
                },
              );
            }
          } else if (
            interaction.isStringSelectMenu() &&
            interaction.customId === 'name'
          ) {
            const [renamedTempChannel] = await changeDatabaseChannelName(
              drizzle,
              currentTempChannel.temp_channel,
              interaction.values[0] || null,
            );

            if (!renamedTempChannel) {
              interaction.reply({
                content: i18n.t('lobby.error.noLobby'),
                ephemeral: true,
              });
              return;
            }

            await changeLobby(
              {
                tempChannel: renamedTempChannel,
                voiceChannel,
                owner: member,
                guild: interaction.guild,
                drizzle,
                i18n,
              },
              {
                interaction,
              },
            );
          } else if (
            interaction.isMentionableSelectMenu() &&
            interaction.customId === 'users' &&
            interaction.inCachedGuild()
          ) {
            interaction.reply({
              content: (
                await addUsers({
                  toAllow: [
                    ...interaction.users.values(),
                    ...interaction.roles.values(),
                  ],
                  activeChannel: voiceChannel,
                  textChannel,
                  tempChannel: currentTempChannel.temp_channel,
                  i18n,
                })
              ).text,
              ephemeral: true,
            });
          } else if (interaction.customId === 'open-rename-modal') {
            const modal = new ModalBuilder();
            modal.setCustomId('rename-modal');
            modal.setTitle(i18n.t('lobby.renameModal.title'));

            const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
            row.addComponents([
              new TextInputBuilder({
                customId: 'name',
                style: TextInputStyle.Short,
                label: i18n.t('lobby.renameModal.nameLabel'),
                value: currentTempChannel.temp_channel.name || undefined,
                maxLength: 80,
              }),
            ]);

            modal.setComponents([row]);

            interaction.showModal(modal);
          } else {
            const changeTo = <ChannelType>interaction.customId;

            if (
              Object.values(ChannelType).includes(changeTo) &&
              changeTo !== currentType &&
              interaction.guild
            ) {
              await changeLobby(
                {
                  tempChannel: currentTempChannel.temp_channel,
                  voiceChannel,
                  owner: member,
                  guild: interaction.guild,
                  drizzle,
                  i18n,
                },
                {
                  changeTo,
                  interaction,
                },
              );
            }
          }
        }
      });

      msgCollectors.set(msg.id, collector);
    }
  }
};

const subscriptionsUnsubbers = new Map<Snowflake, (() => void)[]>();

const addSubscriptionUnsubber = (userId: string, unsubber: () => void) => {
  const unsubbers = subscriptionsUnsubbers.get(userId) || [];
  unsubbers.push(unsubber);
  subscriptionsUnsubbers.set(userId, unsubbers);
};

const destroyRedisSubscriptionListener = (user: Pick<DiscordUser, 'id'>) => {
  subscriptionsUnsubbers.get(user.id)?.forEach((s) => s());

  subscriptionsUnsubbers.delete(user.id);
};

const getTempChannel = (drizzle: DrizzleClient, voiceChannel: VoiceChannel) =>
  drizzle
    .select()
    .from(tempChannels)
    .where(eq(tempChannels.channelId, voiceChannel.id))
    .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
    .innerJoin(users, eq(guildUsers.userId, users.id));

// Listens to new subscriptions
// When there is a new subscription it will send the current lobby state to the user
const createRedisSubscriptionListeners = (
  drizzle: DrizzleClient,
  {
    member: oldOwnerMember,
    guild,
    voiceChannel,
    owner: oldOwnerGuidUser,
  }: {
    member: GuildMember;
    guild: DiscordGuild;
    voiceChannel: VoiceChannel;
    owner: GuildUser;
  },
) => {
  const channelName = userIdToPusherChannel(oldOwnerMember);

  const refresh = async () => {
    const [tempChannel] = await drizzle
      .select()
      .from(tempChannels)
      .where(eq(tempChannels.channelId, voiceChannel.id))
      .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
      .innerJoin(users, eq(guildUsers.userId, users.id));

    if (!tempChannel) {
      destroyRedisSubscriptionListener({ id: oldOwnerGuidUser.userId });
      globalLogger.info(`unsubscribed from channel ${channelName}`);
      return;
    }

    const locale = getLocale({ user: tempChannel.user });
    const i18n = i18next.cloneInstance({ lng: locale });

    changeLobby({
      tempChannel: tempChannel.temp_channel,
      voiceChannel,
      owner: oldOwnerMember,
      guild,
      drizzle,
      i18n,
    });
  };

  const lobbyChangeHandler = async (data: ClientChangeLobby) => {
    const [tempChannel] = await getTempChannel(drizzle, voiceChannel);

    if (!tempChannel) {
      destroyRedisSubscriptionListener({ id: oldOwnerGuidUser.userId });
      return;
    }

    const locale = getLocale({ user: tempChannel.user });
    const i18n = i18next.cloneInstance({ lng: locale });

    let newName: string | null = null;
    if (data.name) newName = data.name;

    const renamedLobby = newName
      ? (
          await changeDatabaseChannelName(
            drizzle,
            tempChannel.temp_channel,
            newName,
          )
        )[0]
      : tempChannel.temp_channel;

    changeLobby(
      {
        tempChannel: renamedLobby || tempChannel.temp_channel,
        voiceChannel,
        owner: oldOwnerMember,
        guild,
        drizzle,
        i18n,
      },
      {
        changeTo: data.type,
        limit: data.limit,
      },
    );
  };

  const addUserHandler = async (data: AddUser) => {
    const [tempChannel] = await getTempChannel(drizzle, voiceChannel);

    if (!tempChannel) {
      destroyRedisSubscriptionListener({ id: oldOwnerGuidUser.userId });
      return;
    }

    const locale = getLocale({ user: tempChannel.user });
    const i18n = i18next.cloneInstance({ lng: locale });

    const user = await guild.members
      .fetch({ cache: true, user: data.user.id })
      .catch(() => null);

    if (!user) return;

    const textChannel = await activeTempText(
      guild.client,
      drizzle,
      tempChannel.temp_channel,
    );

    await addUsers({
      toAllow: [user.user],
      activeChannel: voiceChannel,
      tempChannel: tempChannel.temp_channel,
      textChannel,
      i18n,
    });
  };

  const removeUserHandler = async (data: RemoveUser) => {
    const [tempChannel] = await getTempChannel(drizzle, voiceChannel);

    if (!tempChannel) {
      destroyRedisSubscriptionListener({ id: oldOwnerGuidUser.userId });
      return;
    }

    const locale = getLocale({ user: tempChannel.user });
    const i18n = i18next.cloneInstance({ lng: locale });

    const user = await guild.members
      .fetch({ cache: true, user: data.user.id })
      .catch(() => null);

    if (!user) return;

    await removeFromLobby(
      voiceChannel,
      [user.user],
      [],
      oldOwnerMember.user,
      tempChannel.temp_channel,
      i18n,
      drizzle,
    );
  };

  addSubscriptionUnsubber(
    oldOwnerGuidUser.userId,
    subscribeToLobbyRefresh(
      {
        onData: () => {
          refresh();
        },
      },
      oldOwnerGuidUser.userId,
    ),
  );

  addSubscriptionUnsubber(
    oldOwnerGuidUser.userId,
    subscribeToClientLobbyChanges(
      {
        onData: (data) => {
          lobbyChangeHandler(data);
        },
      },
      oldOwnerGuidUser.userId,
    ),
  );

  addSubscriptionUnsubber(
    oldOwnerGuidUser.userId,
    subscribeToAddUser(
      {
        onData: (data) => {
          addUserHandler(data);
        },
      },
      oldOwnerGuidUser.userId,
    ),
  );

  addSubscriptionUnsubber(
    oldOwnerGuidUser.userId,
    subscribeToRemoveUser(
      {
        onData: (data) => {
          removeUserHandler(data);
        },
      },
      oldOwnerGuidUser.userId,
    ),
  );
};

const checkTempChannel = async (
  client: Client,
  tempChannel: TempChannel,
  oldOwner: GuildUser,
  drizzle: DrizzleClient,
  _i18n: I18n,
  logger: Logger,
  isStartup: boolean = false,
) => {
  const activeChannel = await activeTempChannel(client, drizzle, tempChannel);
  const activeTextChannel = await activeTempText(client, drizzle, tempChannel);

  if (!activeChannel) {
    await drizzle
      .delete(tempChannels)
      .where(eq(tempChannels.channelId, tempChannel.channelId));

    if (activeTextChannel?.deletable)
      await activeTextChannel.delete().catch(() => {});
  } else if (!activeChannel.members.filter((member) => !member.user.bot).size) {
    // If there is no one left in the lobby remove the lobby
    destroyRedisSubscriptionListener({ id: oldOwner.userId });
    await Promise.all([
      activeChannel.delete(),
      activeChannel.id !== activeTextChannel?.id && activeTextChannel?.delete(),
    ]).catch((error) => {
      logger.error(error.description, { error });
    });

    pushLobbyToUser({ id: oldOwner.userId }, null);

    await drizzle
      .delete(tempChannels)
      .where(eq(tempChannels.channelId, tempChannel.channelId));
  } else if (!activeChannel.members.has(`${BigInt(oldOwner.userId)}`)) {
    const memberIds = activeChannel.members.map((member) => member.id);

    const guildUserList = await drizzle
      .select()
      .from(guildUsers)
      .innerJoin(users, eq(guildUsers.userId, users.id))
      .innerJoin(guilds, eq(guildUsers.guildId, guilds.id))
      .leftJoin(tempChannels, eq(guildUsers.id, tempChannels.guildUserId))
      .where(
        and(
          inArray(guildUsers.userId, memberIds),
          eq(guildUsers.guildId, activeChannel.guild.id),
          isNull(tempChannels.channelId),
        ),
      );

    // Alleen users die toegestaan zijn in de lobby kunnen de lobby krijgen
    // Als er niemand in de lobby zit die toegang heeft, dan krijgt iemand de lobby die geen toegang heeft
    // Anders krijgt niemand hem
    const newOwner =
      guildUserList
        .filter((guildUser) => {
          const member = activeChannel.members.get(guildUser.guild_user.userId);

          if (!member) return false;

          const isPublic = getChannelType(activeChannel) === ChannelType.Public;
          const isAllowedUser = activeChannel.permissionOverwrites.cache.has(
            member.id,
          );
          const hasAllowedRole = activeChannel.permissionOverwrites.cache.some(
            (overwrite) =>
              overwrite.id !== activeChannel.guild.id &&
              member.roles.cache.has(overwrite.id),
          );

          return (
            (isPublic || isAllowedUser || hasAllowedRole) && !member.user.bot
          );
        })
        .sort((guildUser1, guildUser2) => {
          const member1 = activeChannel.members.get(
            guildUser1.guild_user.userId,
          );
          const member2 = activeChannel.members.get(
            guildUser2.guild_user.userId,
          );

          if (!member1 || !member2) return 0;

          return (
            member1.roles.highest.position - member2.roles.highest.position
          );
        })
        .reverse()[0] ||
      guildUserList
        .filter((guildUser) => {
          const member = activeChannel.members.get(guildUser.guild_user.userId);

          if (!member) return false;

          return !member.user.bot;
        })
        .sort((guildUser1, guildUser2) => {
          const member1 = activeChannel.members.get(
            guildUser1.guild_user.userId,
          );
          const member2 = activeChannel.members.get(
            guildUser2.guild_user.userId,
          );

          if (!member1 || !member2) return 0;

          return (
            member1.roles.highest.position - member2.roles.highest.position
          );
        })
        .reverse()[0];

    if (newOwner) {
      const [newTempChannel] = await drizzle
        .update(tempChannels)
        .set({ guildUserId: newOwner.guild_user.id })
        .where(eq(tempChannels.channelId, tempChannel.channelId))
        .returning({
          name: tempChannels.name,
          guildUserId: tempChannels.guildUserId,
          channelId: tempChannels.channelId,
          textChannelId: tempChannels.textChannelId,
          controlDashboardId: tempChannels.controlDashboardId,
          createdAt: tempChannels.createdAt,
        });

      if (!newTempChannel) return;

      const i18n = _i18n.cloneInstance({
        lng: newOwner.user.language || newOwner.guild.language || undefined,
      });

      const newOwnerMember = activeChannel.members.get(
        newOwner.guild_user.userId,
      );

      if (newOwnerMember) {
        await activeChannel.permissionOverwrites
          .edit(newOwnerMember, { Speak: true, Connect: true })
          .catch((err) => logger.error(err.message, { error: err }));

        if (newOwnerMember.voice.suppress) {
          newOwnerMember.voice.setMute(false).catch(() => {});
        }

        createRedisSubscriptionListeners(drizzle, {
          member: newOwnerMember,
          guild: activeChannel.guild,
          voiceChannel: activeChannel,
          owner: newOwner.guild_user,
        });

        await Promise.all([
          changeLobby(
            {
              tempChannel: newTempChannel,
              voiceChannel: activeChannel,
              owner: newOwnerMember,
              guild: activeChannel.guild,
              drizzle,
              i18n,
            },
            {
              forcePermissionUpdate: true,
            },
          ),
          activeTextChannel?.send({
            allowedMentions: { users: [] },
            reply: tempChannel.controlDashboardId
              ? { messageReference: tempChannel.controlDashboardId }
              : undefined,
            content: i18n.t('lobby.ownershipTransferred', {
              user: newOwnerMember.user.toString(),
            }),
          }),
        ]).catch((err) => logger.error(err.message, { error: err }));
      }

      publishLobbyUpdate(null, oldOwner.userId);
      destroyRedisSubscriptionListener({ id: oldOwner.userId });
    }
  } else {
    const member = await activeChannel.guild.members.fetch({
      user: `${BigInt(oldOwner.userId)}`,
      cache: true,
    });

    const [guild] = await drizzle
      .select()
      .from(guilds)
      .where(eq(guilds.id, activeChannel.guild.id));

    const [user] = await drizzle
      .select()
      .from(users)
      .where(eq(users.id, oldOwner.userId));

    if (!guild || !user) return;

    const locale = getLocale({
      user,
      guild,
    });
    const i18n = _i18n.cloneInstance({
      lng: locale,
    });

    await createDashBoardCollector({
      client,
      voiceChannel: activeChannel,
      tempChannel,
      guildUser: oldOwner,
      dbUser: user,
      dbGuild: guild,
      drizzle,
      _i18n: i18n,
    });

    await changeLobby({
      tempChannel,
      voiceChannel: activeChannel,
      owner: member,
      guild: activeChannel.guild,
      drizzle,
      i18n,
    });

    if (isStartup) {
      createRedisSubscriptionListeners(drizzle, {
        member,
        guild: activeChannel.guild,
        voiceChannel: activeChannel,
        owner: oldOwner,
      });
    }
  }
};

const checkVoiceCreateChannels = async (
  drizzle: DrizzleClient,
  client: Client,
) => {
  const categoryList = await drizzle
    .select()
    .from(categories)
    .where(
      or(
        isNotNull(categories.publicVoice),
        isNotNull(categories.muteVoice),
        isNotNull(categories.privateVoice),
      ),
    );

  await Promise.all(
    categoryList.map((category) =>
      createCreateChannels(category, drizzle, client).catch((err) => {
        globalLogger.error(err);
      }),
    ),
  );
};

const expo = new Expo();

const sendUserAddPushNotification = (owner: DbUser, toBeAdded: User) => {
  const token = owner.expoPushToken;

  if (!token || !Expo.isExpoPushToken(token)) return Promise.resolve();

  const locale = getLocale({ user: owner });

  const i18n = i18next.cloneInstance({ lng: locale });

  return expo.sendPushNotificationsAsync([
    {
      to: token,
      sound: 'default',
      channelId: 'addUser',
      title: i18n.t('lobby.notification.userAdd.title', {
        user: toBeAdded.username,
      }),
      body: i18n.t('lobby.notification.userAdd.description', {
        user: toBeAdded.username,
      }),
      data: {
        userId: toBeAdded.id,
      },
      categoryId: 'userAdd',
    },
  ]);
};

router.onInit = async (client, drizzle, _i18n, logger) => {
  let isFirst = true;

  // Check elke tempChannel om de 60 seconden
  const checkTempLobbies = async () => {
    const usersWithTemp = await drizzle
      .select()
      .from(tempChannels)
      .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
      .innerJoin(users, eq(guildUsers.userId, users.id));

    globalLogger.debug('checking tempChannels', { usersWithTemp });

    const tempChecks = usersWithTemp.map((tcs) =>
      checkTempChannel(
        client,
        tcs.temp_channel,
        tcs.guild_user,
        drizzle,
        _i18n,
        logger,
        isFirst,
      ),
    );

    await Promise.all(tempChecks).catch((err) =>
      logger.error(err.description, { error: err }),
    );

    isFirst = false;

    setTimeout(checkTempLobbies, 1000 * 60);
  };

  client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (
      !oldChannel.isVoiceBased() ||
      !newChannel.isVoiceBased() ||
      !newChannel.guild
    ) {
      return;
    }

    const [tempChannel] = await drizzle
      .select()
      .from(tempChannels)
      .where(eq(tempChannels.channelId, newChannel.id))
      .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
      .innerJoin(users, eq(guildUsers.userId, users.id));

    if (!tempChannel) return;

    const permissionsChanged = oldChannel.permissionOverwrites.cache.some(
      (overwrite) =>
        !newChannel.permissionOverwrites.cache.has(overwrite.id) ||
        overwrite.allow.bitfield !==
          newChannel.permissionOverwrites.cache.get(overwrite.id)?.allow
            .bitfield,
    );

    if (!permissionsChanged) return;

    const owner = await newChannel.guild.members.fetch({
      user: `${BigInt(tempChannel.user.id)}`,
      cache: true,
    });

    await changeLobby({
      tempChannel: tempChannel.temp_channel,
      voiceChannel: newChannel,
      owner,
      guild: newChannel.guild,
      drizzle,
      i18n: _i18n,
    });
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    // Check of iemand een temp lobby heeft verlaten
    if (oldState?.channel && oldState.channel.id !== newState?.channel?.id) {
      const [tempChannel] = await drizzle
        .select()
        .from(tempChannels)
        .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
        .where(eq(tempChannels.channelId, oldState.channel.id));

      if (tempChannel) {
        globalLogger.debug('user left tempChannel');

        await checkTempChannel(
          client,
          tempChannel.temp_channel,
          tempChannel.guild_user,
          drizzle,
          _i18n,
          logger,
        );
      }
    }

    if (
      newState.channel &&
      newState.channel.parent &&
      oldState.channelId !== newState.channelId &&
      newState.member
    ) {
      // Check of iemand een nieuw kanaal is gejoint
      const { getCategory } = createEntityCache(drizzle);

      const categoryData = await getCategory(newState.channel.parent);
      const [guildUser] = await drizzle
        .select()
        .from(guildUsers)
        .innerJoin(users, eq(guildUsers.userId, users.id))
        .innerJoin(guilds, eq(guildUsers.guildId, guilds.id))
        .leftJoin(tempChannels, eq(guildUsers.id, tempChannels.guildUserId))
        .where(
          and(
            eq(guildUsers.guildId, newState.guild.id),
            eq(guildUsers.userId, newState.member.id),
          ),
        );

      const { member } = newState;

      const { channel } = newState;

      let voiceChannel: VoiceChannel;
      let textChannel: VoiceChannel | TextChannel;

      // Check of iemand een create-lobby channel is gejoint
      if (
        channel &&
        guildUser &&
        member &&
        (channel.id === categoryData.publicVoice ||
          channel.id === categoryData.muteVoice ||
          channel.id === categoryData.privateVoice)
      ) {
        globalLogger.debug('user joined create-lobby channel');
        const activeChannel = await activeTempChannel(
          client,
          drizzle,
          guildUser.temp_channel || undefined,
        );

        if (activeChannel) {
          globalLogger.debug('user already has a tempChannel');
          // Degene had al een kanaal
          newState.setChannel(activeChannel);
        } else if (channel.parent) {
          // Creeer een nieuw kanaal
          globalLogger.debug('user does not have a tempChannel yet');
          globalLogger.debug('creating new tempChannel');

          let type: ChannelType = ChannelType.Public;
          if (channel.id === categoryData.privateVoice)
            type = ChannelType.Nojoin;
          if (channel.id === categoryData.muteVoice)
            type = ChannelType.Mute;

          const lobbyCategory = categoryData.lobbyCategory ? await newState.guild.channels.fetch(
            `${BigInt(categoryData.lobbyCategory)}`, {
              cache: true,
            }
          ).catch(() => null) : null;
    
          voiceChannel = await createTempChannel(
            newState.guild,
            lobbyCategory?.id || newState.channel.parentId || newState.guild.id,
            [],
            member,
            guildUser.guild.bitrate,
            type,
            guildUser.guild,
          );

          newState.setChannel(voiceChannel);

          textChannel = guildUser.guild.seperateTextChannel
            ? await createTextChannel(client, voiceChannel, member, null)
            : voiceChannel;

          const [tempChannel] = await drizzle
            .insert(tempChannels)
            .values([
              {
                channelId: voiceChannel.id,
                guildUserId: guildUser.guild_user.id,
                name: null,
                textChannelId: textChannel.id,
                controlDashboardId: null,
                createdAt: new Date().toISOString(),
              },
            ])
            .returning({
              name: tempChannels.name,
              guildUserId: tempChannels.guildUserId,
              channelId: tempChannels.channelId,
              textChannelId: tempChannels.textChannelId,
              controlDashboardId: tempChannels.controlDashboardId,
              createdAt: tempChannels.createdAt,
            });

          if (!tempChannel) return;

          await createDashBoardCollector({
            client,
            voiceChannel,
            tempChannel,
            guildUser: guildUser.guild_user,
            dbUser: guildUser.user,
            dbGuild: guildUser.guild,
            drizzle,
            _i18n,
          }).catch((error) => {
            logger.error(error.discription, { error });
          });

          const locale = getLocale({ user: guildUser.user });
          const i18n = _i18n.cloneInstance({ lng: locale });

          changeLobby({
            tempChannel,
            voiceChannel,
            owner: member,
            guild: newState.guild,
            drizzle,
            i18n,
          });

          createRedisSubscriptionListeners(drizzle, {
            member,
            guild: newState.guild,
            voiceChannel,
            owner: guildUser.guild_user,
          });

          if (textChannel.id !== voiceChannel.id) {
            await textChannel
              .edit({
                permissionOverwrites: getTextPermissionOverwrites(
                  voiceChannel,
                  client,
                ),
              })
              .catch((error) => {
                logger.error(error.discription, { error });
              });
          }
        }
      } else if (
        // Check of iemand een tempChannel is gejoint
        member &&
        newState.channelId !== oldState.channelId
      ) {
        const [tempChannel] = await drizzle
          .select()
          .from(tempChannels)
          .innerJoin(guildUsers, eq(tempChannels.guildUserId, guildUsers.id))
          .innerJoin(users, eq(guildUsers.userId, users.id))
          .innerJoin(guilds, eq(guildUsers.guildId, guilds.id))
          .where(eq(tempChannels.channelId, channel.id));

        if (tempChannel) {
          const i18n = _i18n.cloneInstance({
            lng:
              tempChannel.user.language ||
              tempChannel.guild.language ||
              undefined,
          });
          const activeChannel = await activeTempChannel(
            client,
            drizzle,
            tempChannel.temp_channel,
          );

          if (
            !activeChannel
              ?.permissionsFor(member)
              ?.has(PermissionsBitField.Flags.Speak, true)
          ) {
            Promise.all([
              await createAddMessage(
                tempChannel.temp_channel,
                tempChannel.guild_user,
                member.user,
                client,
                drizzle,
                i18n,
              ),
              sendUserAddPushNotification(tempChannel.user, member.user),
            ]).catch((err) => logger.error(err.description, { error: err }));
          }

          // Update mobile users
          const owner = await newState.guild?.members
            .fetch({
              cache: true,
              user: `${BigInt(tempChannel.user.id)}`,
            })
            .catch(() => null);
          if (activeChannel && owner) {
            changeLobby({
              tempChannel: tempChannel.temp_channel,
              voiceChannel: activeChannel,
              owner,
              guild: newState.guild,
              drizzle,
              i18n,
            });
          }
        }
      }
    }
  });

  checkTempLobbies();

  await checkVoiceCreateChannels(drizzle, client);
};

export default router;
