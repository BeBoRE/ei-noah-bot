const discordCDN = 'https://cdn.discordapp.com/';

const userAvatar = (id: string, avatar: string, format: string) =>
  `avatars/${id}/${avatar}.${format}`;

const defaultAvatarLegacy = (discriminator: number) =>
  `embed/avatars/${discriminator % 5}.png`;

const defaultAvatar = (id: string) => {
  // eslint-disable-next-line no-bitwise
  const index = Number((BigInt(id) >> BigInt(22)) % BigInt(6));

  return `embed/avatars/${index}.png`;
};

const guildIcon = (id: string, icon: string, format: string) =>
  `icons/${id}/${icon}.${format}`;

export const getUserImageUrl = (user: {
  avatar: string | null;
  id: string;
  discriminator: number;
}) => {
  if (!user.avatar) {
    if (user.discriminator) {
      return `${discordCDN}${defaultAvatarLegacy(user.discriminator)}`;
    }

    return `${discordCDN}${defaultAvatar(user.id)}`;
  }

  return `${discordCDN}${userAvatar(user.id, user.avatar, 'png')}`;
};

export const getGuildImageUrl = (guild: {
  icon?: string | null;
  id: string;
}) =>
  guild.icon ? `${discordCDN}${guildIcon(guild.id, guild.icon, 'png')}` : null;
