import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { pusher } from '@ei/pusher-server';

import { createTRPCRouter, protectedProcedure } from '../trpc';

export const pusherRouter = createTRPCRouter({
  authentication: protectedProcedure
    .input(
      z.object({
        socketId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { socketId } }) => {
      const authResponse = pusher.authenticateUser(socketId, {
        id: ctx.session.user.id,
      });

      return authResponse;
    }),
  authorization: protectedProcedure
    .input(
      z.object({
        socketId: z.string(),
        channelName: z.string(),
      }),
    )
    .mutation(async ({ input: { socketId, channelName }, ctx }) => {
      // Users can only subscribe to their own private channel
      if (channelName === `private-user-${ctx.session.user.id}`) {
        return pusher.authorizeChannel(socketId, channelName);
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }),
});

export default pusherRouter;
