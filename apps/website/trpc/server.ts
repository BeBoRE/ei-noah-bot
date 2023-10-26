/* eslint-disable @typescript-eslint/no-shadow */
import * as context from 'next/headers';
import {
  createTRPCProxyClient,
  loggerLink,
  unstable_httpBatchStreamLink,
} from '@trpc/client';

import { AppRouter, appRouter } from '@ei/trpc';
import { createRscContext } from '@ei/trpc/src/trpc';

import { getApiUrl, transformer } from './shared';

const rscApi = () =>
  createRscContext({ context }).then((ctx) => appRouter.createCaller(ctx));

export const api = createTRPCProxyClient<AppRouter>({
  transformer,
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === 'development' ||
        (op.direction === 'down' && op.result instanceof Error),
    }),
    unstable_httpBatchStreamLink({
      url: getApiUrl(),
      headers() {
        const heads = new Map(context.headers());
        heads.set('x-trpc-source', 'rsc');
        return Object.fromEntries(heads);
      },
    }),
  ],
});

export default rscApi;
