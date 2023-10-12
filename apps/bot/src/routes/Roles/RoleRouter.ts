import { eq } from 'drizzle-orm';

import { guilds } from '@ei/drizzle/tables/schema';

import Router, { HandlerType } from '../../router/Router';

const rolesRouter = new Router('Subscribe to roles');

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

    const message = await msg.channel.send('This is a role menu');

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

export default rolesRouter;
