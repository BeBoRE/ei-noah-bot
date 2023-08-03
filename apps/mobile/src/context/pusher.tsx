import Pusher from 'pusher-js'
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from './auth';
import { api } from 'src/utils/api';

type PusherContextProps = {
  pusher: Pusher | null;
}

const pusherContext = createContext<PusherContextProps>({
  pusher: null,
});

export function usePusher() {
  return useContext(pusherContext);
}

export function PusherProvider({ children } : {children: React.ReactNode}) {
  const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER;
  const appKey = process.env.EXPO_PUBLIC_PUSHER_KEY;

  if (!appKey) throw new Error('Missing EXPO_PUBLIC_PUSHER_KEY');
  if (!cluster) throw new Error('Missing EXPO_PUBLIC_PUSHER_CLUSTER');

  const {authInfo} = useAuth();
  const {mutate: authPusher} = api.pusher.auth.useMutation();

  const pusher = useMemo<Pusher>(() => {
    console.log('Creating new pusher instance')

    const newPusher = new Pusher(appKey, {
      cluster,
      userAuthentication: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({socketId}, callback) => {
          authPusher({socketId}, {
            onSuccess: (data) => {
              console.log('Pusher login', data)
              callback(null, data)
            },
            onError: (error) => {
              console.error(error)
              callback(new Error("Failed pusher auth"), null)
            }
          })
        }
      }
    },);

    return newPusher;
  }, [appKey, authPusher, cluster]);

  useEffect(() => {
    return () => {
      pusher?.disconnect();
    }
  }, [pusher])

  useEffect(() => {
    pusher.signin();
  }, [authInfo?.accessToken, pusher])

  return (
    <pusherContext.Provider value={{pusher}}>
      {children}
    </pusherContext.Provider>
  )
}
