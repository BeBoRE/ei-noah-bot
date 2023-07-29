import { lobbyRouter } from "./routes/lobby";
import { userRouter } from "./routes/users";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  lobby: lobbyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
