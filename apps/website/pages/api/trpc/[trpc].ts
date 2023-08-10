import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter, createTRPCContext } from '@ei/trpc';

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});
