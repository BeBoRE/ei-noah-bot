import { REST } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { Routes } from 'discord-api-types/v10';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { DrizzleClient } from '@ei/drizzle';
import { guildUsers, tempChannels } from '@ei/drizzle/tables/schema';
import {
  addUserSchema,
  clientChangeLobbySchema,
  LobbyChange,
  removeUserSchema,
} from '@ei/lobby';
import {
  publishAddUser,
  publishClientLobbyChanges,
  publishLobbyRefresh,
  publishRemoveUser,
  subscribeToLobbyUpdate,
} from '@ei/redis';

import { discordUserSchema } from '../schemas';
import {
  createTRPCRouter,
  protectedProcedureWithLobby,
  publicProcedure,
} from '../trpc';
import { camelize } from '../utils';

const hasLobby = async (userId: string, drizzle: DrizzleClient) => {
  const [lobby] = await drizzle
    .select()
    .from(tempChannels)
    .innerJoin(guildUsers, eq(guildUsers.id, tempChannels.guildUserId))
    .where(eq(guildUsers.userId, userId));

  return !!lobby;
};

export const getSession = async (token: string) => {
  const rest = new REST({ version: '10', authPrefix: 'Bearer' }).setToken(
    token,
  );
  const userRes = await rest.get(Routes.user()).catch(() => null);

  if (!userRes) {
    return null;
  }

  const user = discordUserSchema.safeParse(camelize(userRes));

  if (user.success) {
    return {
      user: user.data,
      userRestClient: rest,
    };
  }

  console.warn(user.error);

  return null;
};

export const lobbyRouter = createTRPCRouter({
  lobbyUpdate: publicProcedure
    .input(z.string().optional())
    .subscription(async ({ ctx: { drizzle, session }, input: token }) => {
      if (!session) throw new TRPCError({message: 'No session', code: 'BAD_REQUEST'});

      const {userId} = session;

      const lobby = await hasLobby(userId, drizzle);

      return observable<LobbyChange>((emit) => {
        const unsubscribe = subscribeToLobbyUpdate(
          {
            onData: (change) => {
              emit.next(change);
            },
            onSubscribeError: () => {
              emit.error('Error subscribing to lobby changes');
              emit.complete();
            },
            onSubscription: () => {
              if (lobby) publishLobbyRefresh(undefined, userId);
              else {
                emit.next(null);
              }
            },
          },
          userId,
        );

        return () => {
          unsubscribe();
        };
      });
    }),
  changeLobby: protectedProcedureWithLobby
    .input(clientChangeLobbySchema)
    .mutation(async ({ input: change, ctx: { dbUser } }) => {
      publishClientLobbyChanges(change, dbUser.id);
    }),
  addUser: protectedProcedureWithLobby
    .input(addUserSchema)
    .mutation(async ({ input: data, ctx: { dbUser } }) => {
      publishAddUser(data, dbUser.id);
    }),
  removeUser: protectedProcedureWithLobby
    .input(removeUserSchema)
    .mutation(async ({ input: data, ctx: { dbUser } }) => {
      publishRemoveUser(data, dbUser.id);
    }),
});

export default lobbyRouter;
