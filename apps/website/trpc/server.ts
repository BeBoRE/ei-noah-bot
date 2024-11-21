import { cache } from 'react';
import * as context from 'next/headers';
/* eslint-disable @typescript-eslint/no-shadow */
import { createHydrationHelpers } from '@trpc/react-query/rsc';

import { createCaller, type AppRouter } from '@ei/trpc/src/root';
import { createRscContext } from '@ei/trpc/src/trpc';

import { createQueryClient } from './query-client';

const api = createCaller(cache(() => createRscContext({ context })));

const { HydrateClient, trpc: rscApi } = createHydrationHelpers<AppRouter>(
  api,
  createQueryClient,
);

export { HydrateClient };
export default rscApi;
