import { observable } from '@trpc/server/observable';

import { z } from 'zod';
import channelRouter from './routes/channels';
import guildRouter from './routes/guilds';
import { lobbyRouter } from './routes/lobby';
import { notificationRouter } from './routes/notification';
import roleRouter from './routes/roles';
import { userRouter } from './routes/users';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  t,
} from './trpc';

export const appRouter = createTRPCRouter({
  protected: protectedProcedure.input(z.any()).mutation(({input}) => input),
  healthcheck: publicProcedure.query(() => 'OK'),
  time: protectedProcedure.subscription(() =>
    observable<number>((emit) => {
      const interval = setInterval(() => {
        emit.next(Date.now());
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }),
  ),
  user: userRouter,
  lobby: lobbyRouter,
  notification: notificationRouter,
  guild: guildRouter,
  roles: roleRouter,
  channel: channelRouter,
});

export const createCaller = t.createCallerFactory(appRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
