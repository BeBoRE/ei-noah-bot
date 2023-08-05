import React, { useEffect } from "react";
import Constants from "expo-constants";
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
  /**
   * Gets the IP address of your host-machine. If it cannot automatically find it,
   * you'll have to manually set it. NOTE: Port 3000 should work for most but confirm
   * you don't have anything else running on it, or you'd have to change it.
   *
   * **NOTE**: This is only for development. In production, you'll want to set the
   * baseUrl to your production API URL.
   */

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (process.env.EXPO_PUBLIC_VERCEL_URL)
      return process.env.EXPO_PUBLIC_VERCEL_URL;

  if (!localhost) {
    throw new Error(
      "Failed to get localhost. Please define your api url with EXPO_PUBLIC_VERCEL_URL.",
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
