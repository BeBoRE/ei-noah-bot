import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({

});

// export type definition of API
export type AppRouter = typeof appRouter;
