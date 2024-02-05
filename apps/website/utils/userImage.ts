import {
  CDNRoutes,
  DefaultUserAvatarAssets,
  ImageFormat,
  RouteBases,
} from 'discord-api-types/v10';

export const getUserImageUrl = (user: {
  avatar?: string | null;
  id: string;
}) => {
  // eslint-disable-next-line no-bitwise
  const index = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));

  if (!user.avatar)
    return `${RouteBases.cdn}${CDNRoutes.defaultUserAvatar(
      index as DefaultUserAvatarAssets,
    )}`;

  return `${RouteBases.cdn}${CDNRoutes.userAvatar(
    user.id,
    user.avatar,
    ImageFormat.PNG,
  )}`;
};

export const getMemberImageUrl = (
  member: {
    user: {
      avatar?: string | null;
      id: string;
    };
    avatar?: string | null;
  },
  guildId: string,
) => {
  if (!member.avatar) {
    return getUserImageUrl(member.user);
  }

  return `${RouteBases.cdn}${CDNRoutes.guildMemberAvatar(
    guildId,
    member.user.id,
    member.avatar,
    ImageFormat.PNG,
  )}`;
};
