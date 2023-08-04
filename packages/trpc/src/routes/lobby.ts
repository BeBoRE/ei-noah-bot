import { createTRPCRouter, protectedProcedure } from "../trpc";
import TempChannel from '@ei/database/entity/TempChannel';

export const lobbyRouter = createTRPCRouter({
  activeLobby: protectedProcedure.query(async ({ ctx }) => {
    return ctx.em.findOne(TempChannel, {guildUser: {user: {id: ctx.session.user.id}}});
  }),
});
