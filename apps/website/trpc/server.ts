/* eslint-disable @typescript-eslint/no-shadow */
import * as context from 'next/headers';
import {
  createTRPCUntypedClient,
  loggerLink,
  unstable_httpBatchStreamLink,
} from '@trpc/client';

import { AppRouter } from '@ei/trpc';
import { createCaller } from '@ei/trpc/src/root';
import { createRscContext } from '@ei/trpc/src/trpc';

import { getApiUrl, transformer } from './shared';

const rscApi = () =>
  createRscContext({ context }).then((ctx) => createCaller(ctx));

export const api = createTRPCUntypedClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === 'development' ||
        (op.direction === 'down' && op.result instanceof Error),
    }),
    unstable_httpBatchStreamLink({
      transformer,
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
