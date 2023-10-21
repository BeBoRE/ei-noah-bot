'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import {
  createWSClient,
  httpBatchLink,
  loggerLink,
  splitLink,
  wsLink,
} from '@trpc/client';
import superjson from 'superjson';

import { LobbyProvider } from '@ei/react-shared/context/lobby';
import { api } from '../utils/api';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return 'http://localhost:3000'; // dev SSR should use localhost
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const [hostname] = host.split(':');

    if (protocol === 'https:') {
      return `wss://ei.sweaties.net/ws`;
    }

    return `ws://${hostname}:5000/ws`;
  }

  return 'ws://localhost:3001'; // dev SSR should use localhost
};

type Props = {
  children: React.ReactNode;
};

const wsUrl = getWsUrl();

const wsClient = createWSClient({
  url: wsUrl,
});

export default function TRPCReactProvider({ children }: Props) {
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

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
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
              false: httpBatchLink({
                url: `${getBaseUrl()}/api/trpc`,
              }),
            })
          : httpBatchLink({
              url: `${getBaseUrl()}/api/trpc`,
            }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <LobbyProvider>
            {children}
          </LobbyProvider>
        </api.Provider>
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
