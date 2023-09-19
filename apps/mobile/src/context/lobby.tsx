import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { alert, toast } from 'burnt';
import { Channel } from 'pusher-js';
import type { SFSymbol } from 'sf-symbols-typescript';
import { api } from 'src/utils/api';

import {
  ChannelType,
  clientChangeLobby,
  LobbyChange,
  lobbyChangeSchema,
  userIdToPusherChannel,
} from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import { usePusher } from './pusher';

type LobbyContextProps = {
  lobby: LobbyChange | null;
  changeChannelType: (type: ChannelType) => void;
  changeUserLimit: (limit: number) => void;
};

const lobbyContext = createContext<LobbyContextProps>({
  lobby: null,
  changeChannelType: () => {
    throw new Error('Outside of provider');
  },
  changeUserLimit: () => {
    throw new Error('Outside of provider');
  },
});

export function useLobby() {
  return useContext(lobbyContext);
}

export function LobbyProvider({ children }: { children: React.ReactNode }) {
  const { pusher, connectionState } = usePusher();
  const [lobby, setLobby] = useState<LobbyChange | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const { data: user } = api.user.me.useQuery();

  // Listen for connection state changes
  useEffect(() => {
    if (connectionState === 'unavailable') {
      toast({
        title: 'Lost connection',
        message:
          'Could not connect to the server. Please check your internet connection and try again.',
        preset: 'custom',
        icon: {
          ios: {
            name: 'wifi.slash' satisfies SFSymbol,
            color: baseConfig.theme.colors.reject,
          },
        },
        haptic: 'error',
      });

      setLobby(null);
    }
  }, [connectionState]);

  // Listen for lobby changes
  useEffect(() => {
    if (!pusher) return undefined;

    console.log('listening for lobby changes');
    pusher.user.bind('lobbyChange', (newData: unknown) => {
      const result = lobbyChangeSchema.safeParse(newData);
      if (!result.success) {
        if (__DEV__)
          alert({
            title: 'Error',
            message: `Failed to parse lobby data\n${result.error.message}`,
          });
        else
          toast({
            title: 'Error',
            message: `Cannot read lobby data`,
            preset: 'error',
          });

        return;
      }

      setLobby(result.data);
    });

    return () => {
      pusher.user.unbind('lobbyChange');
    };
  }, [pusher]);

  // When connection state changes refresh the lobby
  useEffect(() => {
    if (!pusher || !user) return;

    let channel: Channel | undefined;

    const channelName = userIdToPusherChannel(user);

    if (connectionState === 'connected' && subscribed) {
      console.log('refreshing lobby');
      pusher.send_event('client-refresh', {}, channelName);
    }

    if (connectionState === 'connected' && !subscribed) {
      channel = pusher.subscribe(channelName);
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('subscribed to channel', channelName);
        setSubscribed(true);
      });
    }

    if (connectionState !== 'connected' && subscribed) {
      setLobby(null);
      setSubscribed(false);
    }
  }, [pusher, user, connectionState, subscribed]);

  const props = useMemo(
    () => ({
      lobby,
      changeChannelType: (type: ChannelType) => {
        if (!pusher || !user) return;

        if (connectionState !== 'connected') {
          toast({
            title: 'Error',
            message: 'Cannot change channel type while offline',
            preset: 'error',
          });
          return;
        }

        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              type,
            },
          };
        });

        const channel = pusher.channel(userIdToPusherChannel(user));

        channel.trigger('client-change-lobby', {
          type,
        } satisfies Zod.infer<typeof clientChangeLobby>);
      },
      changeUserLimit: (limit: number) => {
        if (!pusher) return;
        if (!user) return;

        if (connectionState !== 'connected') {
          toast({
            title: 'Error',
            message: 'Cannot change user limit while offline',
            preset: 'error',
          });
          return;
        }

        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              limit,
            },
          };
        });

        const channel = pusher.channel(userIdToPusherChannel(user));

        channel.trigger('client-change-lobby', { limit } satisfies Zod.infer<
          typeof clientChangeLobby
        >);
      },
    }),
    [connectionState, lobby, pusher, user],
  );

  return (
    <lobbyContext.Provider value={props}>{children}</lobbyContext.Provider>
  );
}
