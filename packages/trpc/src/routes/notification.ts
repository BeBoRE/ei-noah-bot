import { z } from 'zod';
import { User } from '@ei/database/entity/User';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const notificationRouter = createTRPCRouter({
  setToken: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.em.findOne(User, { id: ctx.session.user.id });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      user.expoPushToken = input.token;
      await ctx.em.flush();
    }),
});

export default notificationRouter;
