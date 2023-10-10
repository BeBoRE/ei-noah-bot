import { observable } from '@trpc/server/observable';
import { lobbyRouter } from './routes/lobby';
import { notificationRouter } from './routes/notification';
import { userRouter } from './routes/users';
import { createTRPCRouter, protectedProcedure, publicProcedure } from './trpc';

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => 'OK'),
  subscription: protectedProcedure.subscription(() => observable<number>((emit) => {
      const interval = setInterval(() => {
        emit.next(Date.now());
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    })),
  user: userRouter,
  lobby: lobbyRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
