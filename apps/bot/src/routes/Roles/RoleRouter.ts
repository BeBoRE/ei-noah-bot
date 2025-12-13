import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  MessageCreateOptions,
} from 'discord.js';
import { eq } from 'drizzle-orm';

import {generateLoginURL} from '@ei/auth/token'

import { guilds, Role, roles } from '@ei/drizzle/tables/schema';
import { generateRoleMenuContent } from '@ei/trpc/src/utils';

import Router, { HandlerType } from '../../router/Router';

const rolesRouter = new Router('Subscribe to roles');

const roleMenuOptions = (roleList: Role[]): MessageCreateOptions => {
  const text = roleList.length
    ? roleList.map((r) => `<@&${r.id}>`).join('\n')
    : '*No roles available*';

  return {
    content: `**Roles:**\n${text}`,
    allowedMentions: {
      roles: [],
      users: [],
    },
  };
};

rolesRouter.use(
  'create-menu',
  async ({ drizzle, guildUser, msg, getGuild }) => {
    if (!msg.member.permissions.has('Administrator')) {
      return {
        content: 'You must be an administrator to create a role menu',
        ephemeral: true,
      };
    }

    const guild = await getGuild({ id: guildUser.guildId });

    if (guild.roleMenuId && guild.roleMenuChannelId) {
      const message = await msg.guild.channels
        .fetch(guild.roleMenuChannelId)
        .then((channel) =>
          channel?.isTextBased() && guild.roleMenuId
            ? channel?.messages?.fetch(guild.roleMenuId)
            : null,
        );

      if (message) {
        await message.delete();
      }
    }

    const roleList = await drizzle
      .select()
      .from(roles)
      .where(eq(roles.guildId, guildUser.guildId));

    const message = await msg.channel.send(roleMenuOptions(roleList));

    await drizzle
      .update(guilds)
      .set({ roleMenuId: message.id, roleMenuChannelId: message.channel.id })
      .where(eq(guilds.id, guildUser.guildId));

    return {
      content: 'Role menu created',
      ephemeral: true,
    };
  },
  HandlerType.GUILD,
  {
    description: 'Create a role menu',
  },
);

rolesRouter.onInit = (client, drizzle) => {
  client.on('interactionCreate', async (interaction: Interaction) => {
    const { guild } = interaction;
    const { member } = interaction;

    if (!interaction.isButton() || !guild || !member) {
      return;
    }

    if (interaction.customId !== 'getRoleLoginToken') {
      return;
    }

    const url = await generateLoginURL(
      interaction.user.id,
      `/guild/${interaction.guild?.id}/roles`,
    );

    const loginButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Role selection')
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      loginButton,
    );

    const customRoles = await drizzle
      .select()
      .from(roles)
      .where(eq(roles.guildId, guild.id));

    const selectedRoles = Array.isArray(member.roles)
      ? member.roles.filter((r) => customRoles.some((cr) => cr.id === r))
      : member.roles.cache
          .filter((r) => customRoles.some((cr) => cr.id === r.id))
          .map((r) => r.id);

    const text =
      selectedRoles.length <= 0
        ? '*No roles selected*'
        : selectedRoles.map((id) => `<@&${id}>`).join('\n');

    await interaction.reply({
      content: `**Currently Selected Roles:**\n${text}`,
      ephemeral: true,
      allowedMentions: {
        roles: [],
        users: [],
      },
      components: [row],
    });
  });

  client.on('roleDelete', async (role) => {
    await drizzle.delete(roles).where(eq(roles.id, role.id)).execute();

    const [guild] = await drizzle
      .select()
      .from(guilds)
      .where(eq(guilds.id, role.guild.id));

    if (!guild) {
      return;
    }

    const customRoles = await drizzle
      .select()
      .from(roles)
      .where(eq(roles.guildId, role.guild.id));

    const content = generateRoleMenuContent(customRoles);

    if (!guild.roleMenuChannelId || !guild.roleMenuId) {
      return;
    }

    client.channels
      .fetch(guild.roleMenuChannelId, { cache: true })
      .then((channel) => {
        if (!guild.roleMenuChannelId || !guild.roleMenuId) {
          return;
        }

        if (channel?.isTextBased()) {
          channel.messages
            .fetch({ message: guild.roleMenuId, cache: true })
            .then((message) => {
              if (message) {
                message.edit({ content });
              }
            });
        }
      });
  });
};

export default rolesRouter;
