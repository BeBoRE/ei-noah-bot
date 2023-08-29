import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Pusher from 'pusher-js';
import config from 'src/config';
import { api, createVanillaApi } from 'src/utils/api';

import { useAuth } from './auth';

type PusherContextProps = {
  pusher: Pusher | null;
  connectionState: string | null;
};

const pusherContext = createContext<PusherContextProps>({
  pusher: null,
  connectionState: null,
});

export function usePusher() {
  return useContext(pusherContext);
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { authInfo } = useAuth();
  const { mutate: authentication } = api.pusher.authentication.useMutation();
  const { mutate: channelAuthorization } =
    api.pusher.authorization.useMutation();
  const [connectionState, setConnectionState] = useState<string | null>(null);

  const pusher = useMemo<Pusher>(() => {
    console.log('creating pusher', config.pusher.appKey, config.pusher.cluster);

    const newPusher = new Pusher(config.pusher.appKey, {
      cluster: config.pusher.cluster,
      userAuthentication: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({ socketId }, callback) => {
          authentication(
            { socketId },
            {
              onSuccess: (data) => {
                callback(null, data);
              },
              onError: (error) => {
                console.error(error);
                callback(new Error('Failed pusher auth'), null);
              },
            },
          );
        },
      },
      channelAuthorization: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({ channelName, socketId }, callback) => {
          channelAuthorization(
            { channelName, socketId },
            {
              onSuccess: (data) => {
                callback(null, data);
              },
              onError: (error) => {
                console.error(error);
                callback(new Error('Failed pusher auth'), null);
              },
            },
          );
        },
      },
    });

    newPusher.connection.bind(
      'state_change',
      (states: { current: string; previous: string }) => {
        setConnectionState(states.current);
      },
    );

    return newPusher;
  }, [authentication, channelAuthorization]);

  useEffect(() => {
    pusher.signin();
  }, [authInfo?.accessToken, pusher]);

  const props = useMemo(
    () => ({ pusher, connectionState }),
    [pusher, connectionState],
  );

  return (
    <pusherContext.Provider value={props}>{children}</pusherContext.Provider>
  );
}

export function PusherTasks(client: ReturnType<typeof createVanillaApi>) {
  return new Pusher(config.pusher.appKey, {
    cluster: config.pusher.cluster,
    userAuthentication: {
      transport: 'ajax',
      endpoint: '/api/pusher/auth',
      customHandler: async ({ socketId }, callback) => {
        client.pusher.authentication
          .mutate({ socketId })
          .then((data) => {
            callback(null, data);
          })
          .catch((error) => {
            console.error(error);
            callback(new Error('Failed pusher auth'), null);
          });
      },
    },
    channelAuthorization: {
      transport: 'ajax',
      endpoint: '/api/pusher/auth',
      customHandler: async ({ channelName, socketId }, callback) => {
        client.pusher.authorization
          .mutate({ channelName, socketId })
          .then((data) => {
            callback(null, data);
          })
          .catch((error) => {
            console.error(error);
            callback(new Error('Failed pusher auth'), null);
          });
      },
    },
  });
}
