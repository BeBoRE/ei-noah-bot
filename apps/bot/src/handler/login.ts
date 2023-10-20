import { generateLoginURL } from '@ei/lucia';

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BothHandler } from '../router/Router';

export const loginHandler: BothHandler = async ({ user }) => {
  const url = await generateLoginURL(user.id);

  const loginButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Login')
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      loginButton,
    );

  return {
    content: "Click the button below to login",
    ephemeral: true,
    components: [row],
  };
};
