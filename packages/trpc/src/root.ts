import { lobbyRouter } from "./routes/lobby";
import { notificationRouter } from "./routes/notification";
import { pusherRouter } from "./routes/pusher";
import { userRouter } from "./routes/users";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  lobby: lobbyRouter,
  pusher: pusherRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
