import React, { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import {
  httpBatchLink,
  loggerLink,
  splitLink,
  TRPCClientError,
  unstable_httpSubscriptionLink,
} from '@trpc/client';
import config from 'src/config';
import { useAuth } from 'src/context/auth';
import superjson from 'superjson';

import { api } from '@ei/react-shared';
import type { AppRouter, RouterInputs, RouterOutputs } from '@ei/trpc';

import '@azure/core-asynciterator-polyfill';

import { RNEventSource } from 'rn-eventsource-reborn';
import { ReadableStream, TransformStream } from 'web-streams-polyfill';

// RNEventSource extends EventSource's functionality, you can add this to make the typing reflect this but it's not a requirement
declare global {
  interface EventSource extends RNEventSource {}
}
global.EventSource = global.EventSource || RNEventSource;

global.ReadableStream = global.ReadableStream || ReadableStream;
global.TransformStream = global.TransformStream || TransformStream;

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
    if (ws && config.api.wsUrl) return config.api.wsUrl;
    if (ws) return config.api.url.replace('https', 'wss');
    return config.api.url;
  }

  if (!localhost) {
    throw new Error(
      'Failed to get localhost. Please define api.url in your config.',
    );
  }

  if (ws) return `ws://${localhost}:5100/ws`;
  return `http://${localhost}:5100`;
};

/**
 * A set of typesafe hooks for consuming your API.
 */
export { api };
export { RouterInputs, RouterOutputs };

type TRPCProviderProps = {
  children: React.ReactNode;
};

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const { authInfo, signOut } = useAuth();
  const isLoggedIn = authInfo !== null;

  console.log('using api', getBaseUrl());

  const onError = useCallback(
    (err: TRPCClientError<AppRouter>) => {
      if (err.data?.httpStatus === 401) {
        signOut();
      }
    },
    [signOut],
  );

  const [queryClient, unsubscribe] = React.useMemo(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2000 * 1,
          enabled: isLoggedIn,
          gcTime: 1000 * 60 * 60 * 24 * 7,
          retry: (retryCount, err) => {
            if (
              err instanceof TRPCClientError &&
              err.data?.httpStatus === 401
            ) {
              return false;
            }

            return retryCount < 3;
          },
        },
      },
      queryCache: new QueryCache({
        onError: (err) => {
          if (err instanceof TRPCClientError) {
            onError(err);
          }
        },
      }),
      mutationCache: new MutationCache({
        onError: (err) => {
          if (err instanceof TRPCClientError) {
            onError(err);
          }
        },
      }),
    });

    const persister = createAsyncStoragePersister({
      key: authInfo ? `queryClient-${authInfo}` : 'queryClient',
      storage: AsyncStorage,
      serialize: superjson.stringify,
      deserialize: superjson.parse,
    });

    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return [queryClient, unsubscribe];
  }, [isLoggedIn, onError, authInfo]);

  useEffect(
    () => () => {
      unsubscribe();
    },
    [unsubscribe],
  );

  const httpLink = React.useMemo(() => {
    const defaultHeaders = {
      'X-Mobile-App': 'true',
      'Content-Type': 'application/json',
    };

    return httpBatchLink({
      url: `${getBaseUrl()}/api`,
      transformer: superjson,
      headers: authInfo
        ? {
            ...defaultHeaders,
            Authorization: `Bearer ${authInfo}`,
          }
        : defaultHeaders,
    });
  }, [authInfo]);

  const subscriptionLink = React.useMemo(
    () =>
      unstable_httpSubscriptionLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api`,
        connectionParams() {
          const defaultHeaders = {
            'X-Mobile-App': 'true',
          };

          return authInfo
            ? {
                ...defaultHeaders,
                Authorization: `Bearer ${authInfo}`,
              }
            : defaultHeaders;
        },
      }),
    [authInfo],
  );

  useEffect(() => {}, []);

  const trpcClient = React.useMemo(
    () =>
      api.createClient({
        links: [
          loggerLink({
            colorMode: 'ansi',
          }),
          splitLink({
            condition: ({ type }) => type === 'subscription',
            true: subscriptionLink,
            false: httpLink,
          }),
        ],
      }),
    [httpLink, subscriptionLink],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => subscription.remove();
  });

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
