import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  createTRPCProxyClient,
  createWSClient,
  httpBatchLink,
  loggerLink,
  splitLink,
  wsLink,
} from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import config from 'src/config';
import { useAuth } from 'src/context/auth';
import superjson from 'superjson';

import type { AppRouter } from '@ei/trpc';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active' || status === 'inactive');
  }
}

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = (ws = false) => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0];

  if (config.api.url) {
    if (ws) return config.api.url.replace('https', 'wss');
    return config.api.url;
  }

  if (!localhost) {
    throw new Error(
      'Failed to get localhost. Please define api.url in your config.',
    );
  }

  if (ws) return `ws://${localhost}:3001`;
  return `http://${localhost}:3000`;
};

/**
 * A set of typesafe hooks for consuming your API.
 */
export const api = createTRPCReact<AppRouter>();
export { type RouterInputs, type RouterOutputs } from '@ei/trpc';

export const createVanillaApi = (token: string) =>
  createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        headers: {
          authorization: token,
        },
      }),
    ],
  });

const asyncStoragePersistor = createAsyncStoragePersister({
  storage: AsyncStorage,
});

type TRPCProviderProps = {
  children: React.ReactNode;
};

const wsClient = createWSClient({
  url: getBaseUrl(true),
  onOpen: () => {
    console.log('ws open');
  },
  onClose: (cause) => {
    console.log('ws close', cause);
  },
});

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const { authInfo } = useAuth();
  const isLoggedIn = authInfo !== null;

  console.log('using api', getBaseUrl());

  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 1,
            enabled: isLoggedIn,
            cacheTime: 1000 * 60 * 60 * 24,
          },
        },
      }),
    [isLoggedIn],
  );

  const trpcClient = React.useMemo(
    () =>
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
              headers: authInfo
                ? {
                    authorization: `Bearer ${authInfo}`,
                  }
                : undefined,
            }),
          }),
        ],
      }),
    [authInfo],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => subscription.remove();
  });

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        persistOptions={{ persister: asyncStoragePersistor }}
        client={queryClient}
      >
        {children}
      </PersistQueryClientProvider>
    </api.Provider>
  );
}
