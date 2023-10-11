/* eslint-disable @typescript-eslint/no-shadow */
import type * as context from 'next/headers';

import { appRouter } from '@ei/trpc';
import { createRscContext } from '@ei/trpc/src/trpc';

const rscApi = (ctx: typeof context) =>
  createRscContext({ context: ctx }).then((ctx) => appRouter.createCaller(ctx));

export default rscApi;
