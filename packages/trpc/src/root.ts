import { observable } from '@trpc/server/observable';

import { birthdayRouter } from './routes/birthday';
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
  birthday: birthdayRouter,
});

export const createCaller = t.createCallerFactory(appRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
