import { Expo } from 'expo-server-sdk';
import { z } from 'zod';

import { eq } from '@ei/drizzle';
import { sessions } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure } from '../trpc';

export const notificationRouter = createTRPCRouter({
  setToken: protectedProcedure
    .input(
      z.object({
        token: z.string().refine((v) => Expo.isExpoPushToken(v), {
          message: 'Invalid expo push token',
        }),
      }),
    )
    .mutation(async ({ ctx: { session: userSession, drizzle }, input }) => {
      // await auth.updateSessionAttributes(session.sessionId, { expoPushToken: input.token });

      await drizzle
        .update(sessions)
        .set({
          expoPushToken: input.token,
        })
        .where(eq(sessions.id, userSession.id));
    }),
});

export default notificationRouter;
