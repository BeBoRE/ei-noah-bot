import { router, useRootNavigationState, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { SecureStoreInput } from 'src/utils/storage/secureStorage';

type AuthContextType = {
  token: string | null;
  signIn: (info : SecureStoreInput<"discordOauth">) => void;
  signOut: () => void;
};

const authContext = createContext<AuthContextType>({
  token: null,
  signIn: () => {throw new Error('Cannot use signIn outside of AuthProvider')},
  signOut: () => {},
});

export function useAuth() {
  return useContext(authContext);
}

function useProtectedRoute(token : string | null) {
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  const navigationState = useRootNavigationState();

  useEffect(() => {
    if(!navigationState) return;

    if(!token && !inAuthGroup) {
      router.replace('/sign-in')
    } else if (token && inAuthGroup) {
      router.replace('/')
    }
  }, [token, segments, inAuthGroup, navigationState])
}

export function AuthProvider({ children } : {children: React.ReactNode}) {
  const [token, setToken] = useState<string | null>(null)
  
  useProtectedRoute(token);

  const signIn = (info : SecureStoreInput<"discordOauth">) => {
    setToken(info.accessToken);
  }

  const signOut = () => {
    setToken(null);
  }

  return (
    <authContext.Provider value={{token, signIn, signOut}}>
      {children}
    </authContext.Provider>
  );
}
