import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';

import TempChannel from '@ei/database/entity/TempChannel';
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

import {
  bearerSchema,
  Context,
  createTRPCRouter,
  getSession,
  protectedProcedureWithLobby,
  publicProcedure,
} from '../trpc';

const hasLobby = async (userId: string, em: Context['em']) => {
  const lobby = await em.findOne(TempChannel, {
    guildUser: { user: { id: userId } },
  });

  return !!lobby;
};

export const lobbyRouter = createTRPCRouter({
  lobbyUpdate: publicProcedure
    .input(bearerSchema)
    .subscription(async ({ input: token, ctx: { em } }) => {
      const session = await getSession(token);

      if (!session) {
        throw new TRPCError({ message: 'Invalid token', code: 'UNAUTHORIZED' });
      }

      const { user } = session;
      const lobby = await hasLobby(user.id, em);

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
              if (lobby) publishLobbyRefresh(undefined, user.id);
              else {
                emit.next(null);
              }
            },
          },
          user.id,
        );

        return () => {
          unsubscribe();
        };
      });
    }),
  changeLobby: protectedProcedureWithLobby
    .input(clientChangeLobbySchema)
    .mutation(async ({ input: change, ctx: { session } }) => {
      const { user } = session;

      publishClientLobbyChanges(change, user.id);
    }),
  addUser: protectedProcedureWithLobby
    .input(addUserSchema)
    .mutation(async ({ input: data, ctx: { session } }) => {
      const { user } = session;

      publishAddUser(data, user.id);
    }),
  removeUser: protectedProcedureWithLobby
    .input(removeUserSchema)
    .mutation(async ({ input: data, ctx: { session } }) => {
      const { user } = session;

      publishRemoveUser(data, user.id);
    }),
});

export default lobbyRouter;
