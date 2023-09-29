import Redis from 'ioredis';
import channelCreator from 'zod-redis-pubsub/channel';

import {
  addUserSchema,
  clientChangeLobbySchema,
  lobbyChangeSchema,
  removeUserSchema,
} from '@ei/lobby';

const redisUrl = process.env.REDIS_URL;

const publisher = redisUrl ? new Redis(redisUrl) : new Redis();
const subscriber = publisher.duplicate();

const createChannel = channelCreator({ publisher, subscriber });

export const lobbyUpdateChannel = createChannel(
  (userId: string) => `user:${userId}:lobbyUpdate`,
  lobbyChangeSchema,
);
export const {
  publish: publishLobbyUpdate,
  subscribe: subscribeToLobbyUpdate,
} = lobbyUpdateChannel;

export const lobbyRefreshChannel = createChannel(
  (userId) => `user:${userId}:refresh`,
);
export const {
  publish: publishLobbyRefresh,
  subscribe: subscribeToLobbyRefresh,
} = lobbyRefreshChannel;

export const clientLobbyChangesChannel = createChannel(
  (userId) => `user:${userId}:clientChangeLobby`,
  clientChangeLobbySchema,
);
export const {
  publish: publishClientLobbyChanges,
  subscribe: subscribeToClientLobbyChanges,
} = clientLobbyChangesChannel;

export const removeUserChannel = createChannel(
  (userId) => `user:${userId}:removeUser`,
  removeUserSchema,
);
export const { publish: publishRemoveUser, subscribe: subscribeToRemoveUser } =
  removeUserChannel;

export const addUserChannel = createChannel(
  (userId) => `user:${userId}:addUser`,
  addUserSchema,
);
export const { publish: publishAddUser, subscribe: subscribeToAddUser } =
  addUserChannel;
