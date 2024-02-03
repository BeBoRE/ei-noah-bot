import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { registerDevMenuItems } from 'expo-dev-menu';
import {
  router,
  SplashScreen,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import {
  secureStorage,
  SecureStoreInput,
  SecureStoreOutput,
} from 'src/utils/storage/secureStorage';

type AuthContextType = {
  authInfo: SecureStoreOutput<'sessionToken'> | null;
  signIn: (info: SecureStoreInput<'sessionToken'>) => void;
  signOut: () => void;
};

// SplashScreen.preventAutoHideAsync();

registerDevMenuItems([
  {
    name: 'Sign out',
    callback: async () => {
      await secureStorage.delete('sessionToken');
    },
  },
  // {
  //   name: 'Refresh token',
  //   callback: async () => {
  //     const info = await secureStorage.get('sessionToken').catch(() => null);
  //     console.log(info);
  //     const refreshed = await refreshToken(info, true);
  //     console.log(refreshed);
  //   },
  // },
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
  token: SecureStoreOutput<'sessionToken'> | null,
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
    useState<SecureStoreOutput<'sessionToken'> | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Get token from storage on app start
  useEffect(() => {
    (async () => {
      const info = await secureStorage.get('sessionToken').catch(() => null);
      // const refreshed = await refreshToken(info);

      setAuthInfo(info);
    })().finally(() => {
      setIsReady(true);
      SplashScreen.hideAsync();
    });
  }, []);

  const signIn = useCallback(async (info: SecureStoreInput<'sessionToken'>) => {
    const result = await secureStorage.set('sessionToken', info);

    if (result.success) setAuthInfo(result.data);
  }, []);

  const signOut = useCallback(async () => {
    await secureStorage.delete('sessionToken');

    setAuthInfo(null);
  }, []);

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
