import Pusher from 'pusher-js'
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from './auth';
import { api } from 'src/utils/api';
import config from 'src/config';

type PusherContextProps = Pusher | null

const pusherContext = createContext<PusherContextProps>(null);

export function usePusher() {
  return useContext(pusherContext);
}

export function PusherProvider({ children } : {children: React.ReactNode}) {
  const {authInfo} = useAuth();
  const {mutate: authentication} = api.pusher.authentication.useMutation();
  const {mutate: channelAuthorization} = api.pusher.authorization.useMutation();

  const pusher = useMemo<Pusher>(() => {
    const newPusher = new Pusher(config.pusher.appKey, {
      cluster: config.pusher.cluster,
      userAuthentication: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({socketId}, callback) => {
          authentication({socketId}, {
            onSuccess: (data) => {
              callback(null, data)
            },
            onError: (error) => {
              console.error(error)
              callback(new Error("Failed pusher auth"), null)
            }
          })
        }
      },
      channelAuthorization: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({channelName, socketId}, callback) => {
          channelAuthorization({channelName, socketId}, {
            onSuccess: (data) => {
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
  }, [api.pusher, authentication, channelAuthorization]);

  useEffect(() => {
    return () => {
      pusher?.disconnect();
    }
  }, [pusher])

  useEffect(() => {
    pusher.signin();
  }, [authInfo?.accessToken, pusher])

  return (
    <pusherContext.Provider value={pusher}>
      {children}
    </pusherContext.Provider>
  )
}
