import TempChannel from '@ei/database/entity/TempChannel';

import { observable } from '@trpc/server/observable';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

export const lobbyRouter = createTRPCRouter({
  activeLobby: protectedProcedure.query(async ({ ctx }) =>
    ctx.em.findOne(TempChannel, {
      guildUser: { user: { id: ctx.session.user.id } },
    }),
  ),
  subscribeToActiveLobby: publicProcedure.subscription(() => observable<number>((emit) => {
      const interval = setInterval(() => {
        emit.next(Date.now());
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }))
});

export default lobbyRouter;
