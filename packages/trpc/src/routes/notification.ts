import { z } from 'zod';

import { Expo } from 'expo-server-sdk'

import { session } from '@ei/drizzle/tables/schema';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const notificationRouter = createTRPCRouter({
  setToken: protectedProcedure
    .input(
      z.object({
        token: z.string().refine(v => Expo.isExpoPushToken(v), {
          message: 'Invalid expo push token',
        }),
      }),
    )
    .mutation(async ({ ctx: { session: userSession, drizzle }, input }) => {
      // await auth.updateSessionAttributes(session.sessionId, { expoPushToken: input.token });

      await drizzle.update(session)
        .set({
          expoPushToken: input.token
        })
        .where(eq(session.id, userSession.sessionId))
    }),
});

export default notificationRouter;
