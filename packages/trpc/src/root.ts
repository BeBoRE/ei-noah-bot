import { userRouter } from "./routes/users";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
