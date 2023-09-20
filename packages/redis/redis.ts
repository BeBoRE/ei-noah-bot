import Redis from 'ioredis'

import { LobbyChange, lobbyChangeSchema } from '@ei/lobby';

const publisher = new Redis();
const subscriber = publisher.duplicate();

const userIdToChannel = (userId: string) => `user:${userId}`;
const userIdToChannelRefresh = (userId: string) => `user:${userId}:refresh`;
const userIdToChannelLobbyChange = (userId: string) => `user:${userId}:lobbyChange`;

export const sendLobbyChange = (change: NonNullable<LobbyChange>) => publisher.publish(userIdToChannelLobbyChange(change.user.id), JSON.stringify(change));
export const sendLobbyRefreshRequest =  (userId: string) => publisher.publish(userIdToChannelRefresh(userId), '');

export const subscribeUserToLobbyChange = (
  userId: string,
  callback: (change: LobbyChange) => void,
  error?: (err: Error) => void,
  listening?: () => void
) => {
  subscriber.subscribe(userIdToChannelLobbyChange(userId)).then(() => listening?.()).catch(error);

  const handler = (channel : string, message: string) => {
    if (channel === userIdToChannelLobbyChange(userId)) {
      const data = lobbyChangeSchema.safeParse(JSON.parse(message));

      if (!data.success) {
        console.error(data.error);
        return;
      }

      callback(data.data);
    }
  }

  subscriber.addListener('message', handler);

  return () => {
    subscriber.unsubscribe(userIdToChannel(userId))
    subscriber.removeListener('message', handler);
  };
};

export const subscribeUserToRefresh = (
  userId: string,
  callback: () => void,
  error?: (err: Error) => void,
  listening?: () => void
) => {
  subscriber.subscribe(userIdToChannelRefresh(userId)).then(() => listening?.()).catch(error);

  const handler = (channel : string, message : string) => {
    if (channel === userIdToChannel(userId)) {
      const data = lobbyChangeSchema.safeParse(JSON.parse(message));

      if (!data.success) {
        console.error(data.error);
        return;
      }

      callback();
    }
  }

  subscriber.addListener('message', handler);

  return () => {
    subscriber.unsubscribe(userIdToChannel(userId))
    subscriber.removeListener('message', handler);
  };
}
