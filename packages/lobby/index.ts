import emojiRegex from 'emoji-regex';
import { z } from 'zod';

export enum ChannelType {
  Public = 'public',
  Mute = 'mute',
  Nojoin = 'private',
}

export function getIcon(type: ChannelType) {
  if (type === ChannelType.Nojoin) return '🔐';
  if (type === ChannelType.Mute) return '🙊';
  return '🔊';
}

export const lobbyUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  isPermitted: z.boolean(),
  isInChannel: z.boolean(),
  isKickable: z.boolean(),
});

export const recentlyAddedUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string(),
});

export type LobbyUser = z.infer<typeof lobbyUserSchema>;

export const lobbyChangeSchema = z
  .object({
    user: z.object({
      id: z.string(),
      displayName: z.string(),
    }),
    guild: z.object({
      id: z.string(),
      name: z.string(),
      icon: z.string().nullable(),
    }),
    channel: z.object({
      id: z.string(),
      name: z.string().nullable(),
      type: z.nativeEnum(ChannelType),
      limit: z.number().nullable(),
      lobbyNameChangeDate: z.date().nullable().optional(),
    }),
    users: z.array(lobbyUserSchema),
    recentlyAddedUsers: z.array(recentlyAddedUserSchema).nullable(),
  })
  .optional()
  .nullable();

export type LobbyChange = z.infer<typeof lobbyChangeSchema>;

export const addUserSchema = z.object({
  user: z.object({
    id: z.string(),
  }),
});
export type AddUser = z.infer<typeof addUserSchema>;

export const userAddNotificationSchema = z.object({
  userId: z.string(),
});

export const clientChangeLobbySchema = z
  .object({
    type: z.nativeEnum(ChannelType),
    limit: z.number(),
    name: z.string().min(1).max(90),
  })
  .partial();

export type ClientChangeLobby = z.infer<typeof clientChangeLobbySchema>;

export const removeUserSchema = addUserSchema;
export type RemoveUser = z.infer<typeof removeUserSchema>;

export type LobbyNameInfo = {
  icon: string;
  name: string;
  full: string;
};

export const lobbyNameSchema = z.object({
  name: z.string(),
});

export function generateLobbyName(
  type: ChannelType,
  owner: { displayName: string } | null,
  newName?: string | null,
): LobbyNameInfo | null {
  const lobbyTypeIcon = getIcon(type);

  if (newName) {
    if (newName.length > 95) return null;

    const result = emojiRegex().exec(newName);
    if (result && result[0] === newName.slice(0, result[0].length)) {
      const [customIcon] = result;

      // Checks if custom icon is not a voice channel icon
      if (
        !Object.values(ChannelType)
          .map<string>((t) => getIcon(<ChannelType>t))
          .includes(customIcon)
      ) {
        const name = newName.substring(result[0].length, newName.length).trim();

        if (name.length <= 0 || name.length > 90) return null;

        return {
          full: `${customIcon} ${name}`,
          icon: customIcon,
          name,
        };
      }

      const name = newName.trim().slice(customIcon.length).trim();

      if (name.length <= 0 || name.length > 90) return null;

      return {
        full: `${lobbyTypeIcon} ${name}`,
        icon: lobbyTypeIcon,
        name,
      };
    }
  }

  return {
    full: `${lobbyTypeIcon} ${
      newName?.trim() || `${owner ? owner.displayName : 'No one'}'s Lobby`
    }`,
    icon: lobbyTypeIcon,
    name: newName?.trim() || `${owner ? owner.displayName : 'No one'}'s Lobby`,
  }; // `${icon} ${newName || `${owner.displayName}'s Lobby`}`;
}
