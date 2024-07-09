'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { alert } from 'burnt';

import { ChannelType, LobbyChange } from '@ei/lobby';

import { api } from '../api';

type LobbyContextProps = {
  lobby: LobbyChange | null;
  changeChannelType: (type: ChannelType) => void;
  changeUserLimit: (limit: number) => void;
  changeName: (name: string) => void;
};

const lobbyContext = createContext<LobbyContextProps>({
  lobby: null,
  changeChannelType: () => {
    throw new Error('Outside of provider');
  },
  changeUserLimit: () => {
    throw new Error('Outside of provider');
  },
  changeName: () => {
    throw new Error('Outside of provider');
  },
});

export function useLobby() {
  return useContext(lobbyContext);
}

type ProviderProps = {
  children?: React.ReactNode;
  enabled?: boolean;
  token?: string | null;
  alert?: typeof alert;
};

export function LobbyProvider({
  children,
  enabled,
  token,
  alert,
}: ProviderProps) {
  const [lobby, setLobby] = useState<LobbyChange | null>(null);

  const { mutate: changeLobby } = api.lobby.changeLobby.useMutation();

  api.lobby.lobbyUpdate.useSubscription(token || undefined, {
    enabled: enabled === undefined || enabled,
    onData: (data) => {
      setLobby(data);
    },
    onError: (err) => {
      alert?.({
        title: 'Error',
        message: err.message,
        preset: 'error',
      });

      console.error(err);
    }
  });

  const props = useMemo(
    () => ({
      lobby,
      changeChannelType: (type: ChannelType) => {
        let currentState: LobbyChange | null = null;

        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;
          currentState = prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              type,
            },
          };
        });

        changeLobby(
          {
            type,
          },
          {
            onError: (err) => {
              alert?.({
                title: 'Error',
                message: err.message,
                preset: 'error',
              });

              if (err.data?.code === 'NOT_FOUND') {
                // Channel was deleted
                setLobby(null);
                return;
              }

              setLobby(currentState);
            },
          },
        );
      },
      changeUserLimit: (limit: number) => {
        let currentState: LobbyChange | null = null;

        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;
          currentState = prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              limit,
            },
          };
        });

        changeLobby(
          {
            limit,
          },
          {
            onError: (err) => {
              alert?.({
                title: 'Error',
                message: err.message,
                preset: 'error',
              });

              if (err.data?.code === 'NOT_FOUND') {
                // Channel was deleted
                setLobby(null);
                return;
              }

              setLobby(currentState);
            },
          },
        );
      },
      changeName: (name: string) => {
        let currentState: LobbyChange | null = null;

        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;
          currentState = prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              name,
            },
          };
        });

        changeLobby(
          {
            name,
          },
          {
            onError: (err) => {
              alert?.({
                title: 'Error',
                message: err.message,
                preset: 'error',
              });

              if (err.data?.code === 'NOT_FOUND') {
                // Channel was deleted
                setLobby(null);
                return;
              }

              setLobby(currentState);
            },
          },
        );
      },
    }),
    [changeLobby, lobby, alert],
  );

  return (
    <lobbyContext.Provider value={props}>{children}</lobbyContext.Provider>
  );
}
