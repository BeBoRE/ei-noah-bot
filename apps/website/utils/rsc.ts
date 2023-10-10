import { appRouter } from '@ei/trpc';
import { createRscContext } from '@ei/trpc/src/trpc';
import type * as context from 'next/headers'

// eslint-disable-next-line @typescript-eslint/no-shadow
const rscApi = (ctx : typeof context) => createRscContext({ context: ctx }).then(ctx => appRouter.createCaller(ctx))

export default rscApi;
