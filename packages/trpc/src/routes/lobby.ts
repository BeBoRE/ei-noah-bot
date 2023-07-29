import { createTRPCRouter, publicProcedure } from "../trpc";
import TempChannel from '@ei/database/entity/TempChannel';

export const lobbyRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.em.getRepository(TempChannel).findAll({populate: ['guildUser', 'guildUser.user']});
  }),
});
