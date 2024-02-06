'use client';

import { useState } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  createWSClient,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
  wsLink,
} from '@trpc/client';
import SuperJSON from 'superjson';

import { api } from '@ei/react-shared/api';
import { LobbyProvider } from '@ei/react-shared/context/lobby';

import { getApiUrl, getWsUrl, transformer } from './shared';

export { api };

const wsUrl = getWsUrl();

const wsClient =
  wsUrl !== null
    ? createWSClient({
        url: wsUrl,
      })
    : null;

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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1 * 1000,
          },
        },
      }),
  );

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
        wsClient
          ? splitLink({
              condition: ({ type }) => type === 'subscription',
              true: wsLink({ client: wsClient, transformer }),
              false: httpLink,
            })
          : httpLink,
      ],
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <ReactQueryStreamedHydration>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <LobbyProvider api={api}>{children}</LobbyProvider>
        </api.Provider>
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
