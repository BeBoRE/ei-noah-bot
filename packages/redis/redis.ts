import Redis from 'ioredis';
import { z, ZodType } from 'zod';

import {
  addUserSchema,
  ClientChangeLobby,
  clientChangeLobbySchema,
  LobbyChange,
  lobbyChangeSchema,
  removeUserSchema,
} from '@ei/lobby';

const redisUrl = process.env.REDIS_URL;

const publisher = redisUrl ? new Redis(redisUrl) : new Redis();
const subscriber = publisher.duplicate();

const userIdToChannel = (userId: string) => `user:${userId}`;

const userIdToChannelRefresh = (userId: string) =>
  `${userIdToChannel(userId)}:refresh`;

const userIdToChannelLobbyUpdate = (userId: string) =>
  `${userIdToChannel(userId)}:lobbyUpdate`;

const userIdToClientChangeLobby = (userId: string) =>
  `${userIdToChannel(userId)}:clientChangeLobby`;

const userIdToUserAdd = (userId: string) =>
  `${userIdToChannel(userId)}:addUser`;

const userIdToUserRemove = (userId: string) =>
  `${userIdToChannel(userId)}:removeUser`;

export const sendLobbyUpdate = (userId: string, change: LobbyChange) =>
  publisher.publish(
    userIdToChannelLobbyUpdate(userId),
    change ? JSON.stringify(change) : JSON.stringify(null),
  );

export const requestLobbyUpdate = (userId: string) =>
  publisher.publish(userIdToChannelRefresh(userId), JSON.stringify(null));

export const sendClientLobbyChange = (
  userId: string,
  change: ClientChangeLobby,
) => {
  publisher.publish(userIdToClientChangeLobby(userId), JSON.stringify(change));
};

export const sendAddUser = (
  userId: string,
  data: z.infer<typeof addUserSchema>,
) => {
  publisher.publish(userIdToUserAdd(userId), JSON.stringify(data));
};

export const sendRemoveUser = (
  userId: string,
  data: z.infer<typeof removeUserSchema>,
) => {
  publisher.publish(userIdToUserRemove(userId), JSON.stringify(data));
};

interface SubscriberOptions<T extends ZodType<unknown>> {
  channel: string;
  schema: T;
  callback: (data: Zod.infer<T>) => void;
  error?: (err: Error) => void;
  listening?: () => void;
}

const subscribe = <T extends ZodType<unknown>>({
  channel,
  schema,
  callback,
  error,
  listening,
}: SubscriberOptions<T>) => {
  subscriber
    .subscribe(channel)
    .then(() => listening?.())
    .catch(error);

  const handler = (msgChannel: string, msg: string) => {
    if (channel === msgChannel) {
      const data = schema.safeParse(JSON.parse(msg));

      if (!data.success) {
        console.error(data.error);
        return;
      }

      callback(data.data);
    }
  };

  subscriber.addListener('message', handler);

  return () => {
    subscriber.unsubscribe(channel);
    subscriber.removeListener('message', handler);
  };
};

export const subscribeToLobbyUpdates = ({
  userId,
  callback,
  error,
  listening,
}: {
  userId: string;
  callback: (change: LobbyChange | null) => void;
  error?: (err: Error) => void;
  listening?: () => void;
}) =>
  subscribe({
    channel: userIdToChannelLobbyUpdate(userId),
    schema: lobbyChangeSchema,
    callback,
    error,
    listening,
  });

export const subscribeToRefreshRequests = ({
  userId,
  callback,
  error,
  listening,
}: {
  userId: string;
  callback: () => void;
  error?: (err: Error) => void;
  listening?: () => void;
}) =>
  subscribe({
    channel: userIdToChannelRefresh(userId),
    schema: z.unknown(),
    callback,
    error,
    listening,
  });

export const subscribeToClientLobbyChanges = ({
  userId,
  callback,
  error,
  listening,
}: {
  userId: string;
  callback: (change: ClientChangeLobby) => void;
  error?: (err: Error) => void;
  listening?: () => void;
}) =>
  subscribe({
    channel: userIdToClientChangeLobby(userId),
    schema: clientChangeLobbySchema,
    callback,
    error,
    listening,
  });

export const subscribeToAddUser = ({
  userId,
  callback,
  error,
  listening,
}: {
  userId: string;
  callback: (change: z.infer<typeof addUserSchema>) => void;
  error?: (err: Error) => void;
  listening?: () => void;
}) =>
  subscribe({
    channel: userIdToUserAdd(userId),
    schema: addUserSchema,
    callback,
    error,
    listening,
  });

export const subscribeToRemoveUser = ({
  userId,
  callback,
  error,
  listening,
}: {
  userId: string;
  callback: (change: z.infer<typeof removeUserSchema>) => void;
  error?: (err: Error) => void;
  listening?: () => void;
}) =>
  subscribe({
    channel: userIdToUserRemove(userId),
    schema: removeUserSchema,
    callback,
    error,
    listening,
  });
