import TempChannel from '@ei/database/entity/TempChannel';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const lobbyRouter = createTRPCRouter({
  activeLobby: protectedProcedure.query(async ({ ctx }) => ctx.em.findOne(TempChannel, { guildUser: { user: { id: ctx.session.user.id } } })),
});

export default lobbyRouter;
