import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guildUsers } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure, rest } from '../trpc';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => ctx.discordUser),
  memberMe: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.drizzle
        .select()
        .from(guildUsers)
        .where(
          and(
            eq(guildUsers.guildId, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        )
        .then((gu) => gu[0]);

      if (!member) {
        return null;
      }

      const discordMember = await rest.get(
        Routes.guildMember(input.guildId, ctx.dbUser.id),
      );

      console.log(discordMember);

      return discordMember;
    }),
});

export default userRouter;
