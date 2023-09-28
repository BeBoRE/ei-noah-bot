import Redis from 'ioredis';

import {
  addUserSchema,
  clientChangeLobbySchema,
  lobbyChangeSchema,
  removeUserSchema,
} from '@ei/lobby';

import channelCreator from 'zod-redis-pubsub';

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
  (userId: string) => `user:${userId}:refresh`,
);
export const {
  publish: publishLobbyRefresh,
  subscribe: subscribeToLobbyRefresh,
} = lobbyRefreshChannel;

export const clientLobbyChangesChannel = createChannel(
  (userId: string) => `user:${userId}:clientChangeLobby`,
  clientChangeLobbySchema,
);
export const {
  publish: publishClientLobbyChanges,
  subscribe: subscribeToClientLobbyChanges,
} = clientLobbyChangesChannel;

export const removeUserChannel = createChannel(
  (userId: string) => `user:${userId}:removeUser`,
  removeUserSchema,
);
export const { publish: publishRemoveUser, subscribe: subscribeToRemoveUser } =
  removeUserChannel;

export const addUserChannel = createChannel(
  (userId: string) => `user:${userId}:addUser`,
  addUserSchema,
);
export const { publish: publishAddUser, subscribe: subscribeToAddUser } =
  addUserChannel;
