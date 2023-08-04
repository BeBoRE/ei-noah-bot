import { z } from 'zod'
import emojiRegex from 'emoji-regex';


export enum ChannelType {
  Public = 'public',
  Mute = 'mute',
  Nojoin = 'private',
}

export function getIcon(type : ChannelType) {
  if (type === ChannelType.Nojoin) return '🔐';
  if (type === ChannelType.Mute) return '🙊';
  return '🔊';
}

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  isAllowed: z.boolean(),
  isKickable: z.boolean(),
})

export const lobbyChangeSchema = z.object({
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
  }),
  users: z.array(userSchema),
}).optional().nullable()

export const addUserSchema = z.object({
  user: z.object({
    id: z.string(),
  })
})

export const clientChangeLobby = z.object({
  type: z.nativeEnum(ChannelType),
  limit: z.number(),
}).partial()

export const removeUserSchema = addUserSchema;

export function generateLobbyName(
  type : ChannelType,
  owner : { displayName: string },
  newName ?: string,
  textChat?: boolean,
) : string | null {
  const icon = getIcon(type);

  if (newName) {
    const result = emojiRegex().exec(newName);
    if (result && result[0] === newName.slice(0, result[0].length)) {
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

  if (textChat) return `📝${newName || `${owner.displayName}`} chat`;
  return `${icon} ${newName || `${owner.displayName}'s Lobby`}`;
}

export const voiceIdToPusherChannel = (voiceChannel : {id : string}) => `private-channel-${voiceChannel.id}`
