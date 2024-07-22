'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { alert } from 'burnt';

import { ChannelType, LobbyChange } from '@ei/lobby';

import { api } from '../api';

type LobbyContextProps = {
  lobby: LobbyChange | null;
  changeChannelType: (type: ChannelType) => void;
  changeUserLimit: (limit: number) => void;
  changeName: (name: string) => void;
  subscription: ReturnType<typeof api.lobby.lobbyUpdate.useSubscription>;
};

const lobbyContext = createContext<LobbyContextProps | null>(null);

export function useLobby() {
  const context = useContext(lobbyContext);

  if (!context) {
    throw new Error('useLobby must be used within a LobbyProvider');
  }

  return context;
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

  const subscription = api.lobby.lobbyUpdate.useSubscription(
    token || undefined,
    {
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
      },
    },
  );

  const changeChannelType = useCallback(
    (type: ChannelType) => {
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
    [alert, changeLobby],
  );

  const changeUserLimit = useCallback(
    (limit: number) => {
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
    [alert, changeLobby],
  );

  const changeName = useCallback(
    (name: string) => {
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
    [alert, changeLobby],
  );

  const props = useMemo(
    () => ({
      lobby,
      subscription,
      changeChannelType,
      changeUserLimit,
      changeName,
    }),
    [lobby, subscription, changeChannelType, changeUserLimit, changeName],
  );

  return (
    <lobbyContext.Provider value={props}>{children}</lobbyContext.Provider>
  );
}
