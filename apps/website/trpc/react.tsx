'use client';

import { useState } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
  unstable_httpSubscriptionLink,
} from '@trpc/client';
import SuperJSON from 'superjson';

import { api } from '@ei/react-shared/api';
import { LobbyProvider } from '@ei/react-shared/context/lobby';

import { createQueryClient } from './query-client';
import { getApiUrl, transformer } from './shared';

export { api };

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

type Props = {
  children: React.ReactNode;
  headers: Headers;
};

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : null,
  serialize: SuperJSON.stringify,
  deserialize: SuperJSON.parse,
});

export default function TRPCReactProvider({ children, headers }: Props) {
  const queryClient = getQueryClient();

  const httpLink = unstable_httpBatchStreamLink({
    transformer,
    url: getApiUrl(),
    headers() {
      const heads = new Map(headers);
      heads.set('x-trpc-source', 'react');
      return Object.fromEntries(heads);
    },
  });

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        splitLink({
          condition: ({ type }) => type === 'subscription',
          true: unstable_httpSubscriptionLink({
            transformer,
            url: getApiUrl(),
          }),
          false: httpLink,
        }),
      ],
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <LobbyProvider>{children}</LobbyProvider>
      </api.Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
