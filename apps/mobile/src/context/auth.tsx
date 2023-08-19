import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { registerDevMenuItems } from 'expo-dev-menu';
import {
  router,
  SplashScreen,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import { api } from 'src/utils/api';
import { refreshToken } from 'src/utils/auth';
import {
  secureStorage,
  SecureStoreInput,
  SecureStoreOutput,
} from 'src/utils/storage/secureStorage';

type AuthContextType = {
  authInfo: SecureStoreOutput<'discordOauth'> | null;
  signIn: (info: SecureStoreInput<'discordOauth'>) => void;
  signOut: () => void;
};

SplashScreen.preventAutoHideAsync();

registerDevMenuItems([
  {
    name: 'Sign out',
    callback: async () => {
      await secureStorage.delete('discordOauth');
    },
  },
  {
    name: 'Refresh token',
    callback: async () => {
      const info = await secureStorage.get('discordOauth').catch(() => null);
      console.log(info);
      const refreshed = await refreshToken(info);
      console.log(refreshed);
    },
  },
]);

const authContext = createContext<AuthContextType>({
  authInfo: null,
  signIn: () => {
    throw new Error('Cannot use signIn outside of AuthProvider');
  },
  signOut: () => {},
});

export function useAuth() {
  return useContext(authContext);
}

function useProtectedRoute(
  token: SecureStoreOutput<'discordOauth'> | null,
  isReady: boolean,
) {
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState || !isReady) return;

    if (!token && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (token && inAuthGroup) {
      router.replace('/');
    }
  }, [token, segments, inAuthGroup, navigationState, isReady]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authInfo, setAuthInfo] =
    useState<SecureStoreOutput<'discordOauth'> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const context = api.useContext();

  // Get token from storage on app start
  useEffect(() => {
    (async () => {
      const info = await secureStorage.get('discordOauth').catch(() => null);
      // const refreshed = await refreshToken(info);

      setAuthInfo(info);
    })().finally(() => {
      setIsReady(true);
      SplashScreen.hideAsync();
    });
  }, []);

  // Refresh token when it expires
  useEffect(() => {
    if (!authInfo || !authInfo.expiresAt) return undefined;

    const timeout = setTimeout(async () => {
      const newToken = await refreshToken(authInfo);

      setAuthInfo(newToken);
    }, authInfo.expiresAt.getTime() - Date.now());

    return () => clearTimeout(timeout);
  }, [authInfo]);

  const signIn = useCallback(async (info: SecureStoreInput<'discordOauth'>) => {
    const result = await secureStorage.set('discordOauth', info);

    if (result.success) setAuthInfo(result.data);
  }, []);

  const signOut = useCallback(async () => {
    await secureStorage.delete('discordOauth');
    context.invalidate();

    setAuthInfo(null);
  }, [context]);

  useProtectedRoute(authInfo, isReady);

  const contextValue = useMemo(
    () => ({
      authInfo,
      signIn,
      signOut,
    }),
    [authInfo, signIn, signOut],
  );

  return (
    <authContext.Provider value={contextValue}>{children}</authContext.Provider>
  );
}
