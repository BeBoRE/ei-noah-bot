'use client';

import { useEffect, useState } from 'react';
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

import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { api } from '../utils/api';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return 'http://localhost:3000'; // dev SSR should use localhost
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;

    if (protocol === 'https:') {
      return `wss://${host}`;
    }

    return `ws://${host}`;
  }

  return 'ws://localhost:3001'; // dev SSR should use localhost
};

type Props = {
  children: React.ReactNode;
  session: Session | null;
};

export default function TRPCReactProvider({ children, session }: Props) {
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

  const wsClient = createWSClient({
    url: getWsUrl(),
  });

  useEffect(() => () => {
    wsClient.close();
  });

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        splitLink({
          condition: ({ type }) => type === 'subscription',
          true: wsLink({ client: wsClient }),
          false: httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
          }),
        }),
      ],
    }),
  );

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration>
          <api.Provider client={trpcClient} queryClient={queryClient}>
            {children}
          </api.Provider>
        </ReactQueryStreamedHydration>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
