import { observable } from '@trpc/server/observable';

import {
  addUserSchema,
  clientChangeLobbySchema,
  LobbyChange,
  removeUserSchema,
} from '@ei/lobby';
import {
  requestLobbyUpdate,
  sendAddUser,
  sendClientLobbyChange,
  sendRemoveUser,
  subscribeToLobbyUpdates,
} from '@ei/redis';

import {
  bearerSchema,
  createTRPCRouter,
  getSession,
  protectedProcedure,
  publicProcedure,
} from '../trpc';

export const lobbyRouter = createTRPCRouter({
  lobbyUpdate: publicProcedure
    .input(bearerSchema)
    .subscription(async ({ input: token }) => {
      const session = await getSession(token);

      if (!session) {
        throw new Error('Invalid token');
      }

      const { user } = session;

      return observable<LobbyChange>((emit) => {
        const unsubscribe = subscribeToLobbyUpdates({
          userId: user.id,
          callback: (change) => {
            emit.next(change);
          },
          error: () => {
            emit.error('Error subscribing to lobby changes');
            emit.complete();
          },
          listening: () => {
            console.log('Subscribed to lobby changes');
            requestLobbyUpdate(user.id);
          },
        });

        return () => unsubscribe();
      });
    }),
  changeLobby: protectedProcedure
    .input(clientChangeLobbySchema)
    .mutation(async ({ input: change, ctx: { session } }) => {
      const { user } = session;

      sendClientLobbyChange(user.id, change);
    }),
  addUser: protectedProcedure
    .input(addUserSchema)
    .mutation(async ({ input: data, ctx: { session } }) => {
      const { user } = session;

      sendAddUser(user.id, data);
    }),
  removeUser: protectedProcedure
    .input(removeUserSchema)
    .mutation(async ({ input: data, ctx: { session } }) => {
      const { user } = session;

      sendRemoveUser(user.id, data);
    }),
});

export default lobbyRouter;
