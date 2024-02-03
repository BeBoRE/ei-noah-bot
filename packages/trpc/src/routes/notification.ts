import { z } from 'zod';

import { Expo } from 'expo-server-sdk'

import { auth } from '@ei/lucia';
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
    .mutation(async ({ ctx: { session }, input }) => {
      await auth.updateSessionAttributes(session.sessionId, { expoPushToken: input.token });
    }),
});

export default notificationRouter;
