import { observable } from '@trpc/server/observable';
import { LobbyChange } from '@ei/lobby';
import { sendLobbyRefreshRequest, subscribeUserToLobbyChange } from '@ei/redis';
import { bearerSchema, createTRPCRouter, getSession, publicProcedure } from '../trpc';

export const lobbyRouter = createTRPCRouter({
  lobbyChange: publicProcedure.input(bearerSchema).subscription(async ({input: token}) => {
    const session = await getSession(token);

    if (!session) {
      throw new Error('Invalid token');
    }

    const { user } = session;

    return observable<LobbyChange>((emit) => {
      const unsubscribe = subscribeUserToLobbyChange(user.id, (change) => {
        emit.next(change);
      }, () => {
        emit.error('Error subscribing to lobby changes');
        emit.complete();
      }, () => {
        console.log('Subscribed to lobby changes');
        sendLobbyRefreshRequest(user.id);
      });

      return () => unsubscribe();
    })
} )
});

export default lobbyRouter;
