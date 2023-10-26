'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import {
  createWSClient,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
  wsLink,
} from '@trpc/client';

import { api } from '@ei/react-shared/api';

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
    url: getApiUrl(),
    headers() {
      const heads = new Map(headers);
      heads.set('x-trpc-source', 'react');
      return Object.fromEntries(heads);
    },
  });

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        wsClient
          ? splitLink({
              condition: ({ type }) => type === 'subscription',
              true: wsLink({ client: wsClient }),
              false: httpLink,
            })
          : httpLink,
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </api.Provider>
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
