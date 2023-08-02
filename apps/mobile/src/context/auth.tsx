import { SplashScreen, router, useRootNavigationState, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { SecureStoreInput, SecureStoreOutput, secureStorage } from 'src/utils/storage/secureStorage';

type AuthContextType = {
  authInfo: SecureStoreInput<"discordOauth"> | null;
  signIn: (info : SecureStoreInput<"discordOauth">) => void;
  signOut: () => void;
};

SplashScreen.preventAutoHideAsync();

const authContext = createContext<AuthContextType>({
  authInfo: null,
  signIn: () => {throw new Error('Cannot use signIn outside of AuthProvider')},
  signOut: () => {},
});

export function useAuth() {
  return useContext(authContext);
}

function useProtectedRoute(token : SecureStoreInput<"discordOauth"> | null, isReady: boolean) {
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  const navigationState = useRootNavigationState();

  useEffect(() => {
    if(!navigationState || !isReady) return;

    if(!token && !inAuthGroup) {
      router.replace('/sign-in')
    } else if (token && inAuthGroup) {
      router.replace('/')
    }
  }, [token, segments, inAuthGroup, navigationState, isReady])
}

export function AuthProvider({ children } : {children: React.ReactNode}) {
  const [authInfo, setAuthInfo] = useState<SecureStoreOutput<"discordOauth"> | null>(null)
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await secureStorage.get('discordOauth').catch(() => null);

      setAuthInfo(token);
    })().finally(() => {
      setIsReady(true)
      SplashScreen.hideAsync();
    });
  }, []);

  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useProtectedRoute(authInfo, isReady);

  return (
    <authContext.Provider value={{authInfo: authInfo, signIn: setAuthInfo, signOut: () => setAuthInfo(null)}}>
      {children}
    </authContext.Provider>
  );
}
