import { z } from 'zod';

import { users } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure } from '../trpc';

export const notificationRouter = createTRPCRouter({
  setToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
      }),
    )
    .mutation(
      async ({
        ctx: {
          session: { user },
          drizzle,
        },
        input,
      }) => {
        await drizzle
          .insert(users)
          .values({ id: user.id, expoPushToken: input.token })
          .onConflictDoUpdate({
            target: users.id,
            set: { expoPushToken: input.token },
          });
      },
    ),
});

export default notificationRouter;
