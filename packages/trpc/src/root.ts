import { lobbyRouter } from './routes/lobby';
import { notificationRouter } from './routes/notification';
import { userRouter } from './routes/users';
import { createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  user: userRouter,
  lobby: lobbyRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
