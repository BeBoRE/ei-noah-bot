import React, { useEffect } from "react";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import NetInfo from "@react-native-community/netinfo";

import type { AppRouter } from "@ei/trpc";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuth } from "src/context/auth";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import config from "src/config";

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected)
  })
})

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}

/**
 * A set of typesafe hooks for consuming your API.
 */
export const api = createTRPCReact<AppRouter>();
export { type RouterInputs, type RouterOutputs } from "@ei/trpc";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (config.api.url)
      return config.api.url;

  if (!localhost) {
    throw new Error(
      "Failed to get localhost. Please define api.url in your config.",
    );
  }

  return `http://${localhost}:3000`;
};

const asyncStoragePersistor = createAsyncStoragePersister({
  storage: AsyncStorage
})

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */

export function TRPCProvider(props: { children: React.ReactNode }) {
  const { authInfo } = useAuth();
  const isLoggedIn = !!authInfo?.accessToken;

  console.log('using api', getBaseUrl())
  
  const queryClient = React.useMemo(() => new QueryClient({defaultOptions: {queries: {staleTime: 1000 * 1, enabled: isLoggedIn}}}), [isLoggedIn]);

  const trpcClient = React.useMemo(() =>
    {
      return api.createClient({
        transformer: superjson,
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers: authInfo?.accessToken ? {
              authorization: authInfo?.accessToken,
            } : undefined
          }),
        ],
      })
    }, [authInfo?.accessToken]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange)

    return () => subscription.remove()
  })

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider persistOptions={{persister: asyncStoragePersistor}} client={queryClient}>
        {props.children}
      </PersistQueryClientProvider>
    </api.Provider>
  );
}
