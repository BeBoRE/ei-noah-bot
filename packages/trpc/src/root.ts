import { lobbyRouter } from './routes/lobby';
import { notificationRouter } from './routes/notification';
import { userRouter } from './routes/users';
import { createTRPCRouter, publicProcedure } from './trpc';

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => 'OK'),
  user: userRouter,
  lobby: lobbyRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
