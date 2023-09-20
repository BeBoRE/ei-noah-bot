import { Redis } from 'ioredis';

import { LobbyChange, lobbyChangeSchema } from '@ei/lobby';

const redis = new Redis();

const userIdToChannel = (userId: string) => `user:${userId}`;

export const sendLobbyChange = async (change: NonNullable<LobbyChange>) => {
  await redis.publish(userIdToChannel(change.user.id), JSON.stringify(change));
};

export const subscribeUserToLobbyChange = async (
  userId: string,
  callback: (change: LobbyChange) => void,
) => {
  await redis.subscribe(userIdToChannel(userId));

  redis.on('message', (channel, message) => {
    if (channel === userIdToChannel(userId)) {
      const data = lobbyChangeSchema.safeParse(JSON.parse(message));

      if (!data.success) {
        console.error(data.error);
        return;
      }

      callback(data.data);
    }
  });

  return () => redis.unsubscribe(userIdToChannel(userId));
};
