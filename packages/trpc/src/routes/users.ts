import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../trpc';
import { getCachedOrApiMember } from '../utils/discordApi';
import { deleteSession } from '@ei/auth';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => ctx.discordUser),
  memberMe: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const discordMember = await getCachedOrApiMember(
        input.guildId,
        ctx.dbUser.id,
      );

      if (!discordMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not in this guild',
        });
      }

      return discordMember;
    }),
  logout: protectedProcedure.mutation(async ({ ctx: { session } }) => {
    await deleteSession(session.id);
  }),
});

export default userRouter;
